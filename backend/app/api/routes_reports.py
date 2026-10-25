import io
import asyncio
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, Query, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_

from app.core.database import get_db
from app.agents.report_parser import report_parser_agent
from app.models.schema import MedicalReport

router = APIRouter()

@router.post("/upload")
async def upload_report(
    file: UploadFile = File(...),
    username: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    contents = await file.read()
    raw_text = ""

    # Attempt PDF text extraction
    if file.filename.lower().endswith(".pdf"):
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(contents))
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    raw_text += page_text + "\n"
        except Exception:
            pass

    if not raw_text.strip():
        # Fallback to text decoding or OCR placeholder
        try:
            raw_text = contents.decode("utf-8", errors="ignore")
        except Exception:
            raw_text = f"Binary medical document: {file.filename}"

    clean_username = username.strip().lower() if username else None

    # Parse with Clover (Gemini Multimodal Vision + Text OCR)
    parsed = await report_parser_agent.parse_report(
        report_text=raw_text,
        file_name=file.filename,
        file_bytes=contents,
        patient_name=clean_username,
    )

    # Save to Neon DB / SQLite with user identity
    try:
        # If user has an existing report, replace it with the fresh upload
        if clean_username:
            try:
                old_stmt = select(MedicalReport).where(
                    or_(
                        MedicalReport.username == clean_username,
                        and_(
                            MedicalReport.username.is_(None),
                            MedicalReport.file_name.ilike(f"%{clean_username}%")
                        )
                    )
                )
                old_res = await db.execute(old_stmt)
                for old_rep in old_res.scalars().all():
                    await db.delete(old_rep)
                await db.commit()
            except Exception:
                pass

        new_report = MedicalReport(
            username=clean_username,
            file_name=file.filename,
            raw_text=raw_text[:4000],
            extracted_biomarkers=parsed,
        )
        db.add(new_report)
        await db.commit()
        await db.refresh(new_report)
        report_id = str(new_report.id)
    except Exception as e:
        print(f"[A24 Report Upload Error] {e}")
        report_id = "demo-report-id"

    return {
        "success": True,
        "report_id": report_id,
        "username": clean_username,
        "file_name": file.filename,
        "parsed_data": parsed,
    }

@router.get("/latest")
async def get_latest_report(
    username: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    clean_username = username.strip().lower() if username else None

    # 1. User is Logged In: Only retrieve THIS user's medical report
    if clean_username:
        try:
            first_name = clean_username.split()[0]
            # Match directly on username, OR claim unassigned reports matching user's name/file
            stmt = (
                select(MedicalReport)
                .where(
                    or_(
                        MedicalReport.username == clean_username,
                        and_(
                            MedicalReport.username.is_(None),
                            or_(
                                MedicalReport.file_name.ilike(f"%{clean_username}%"),
                                MedicalReport.file_name.ilike(f"%{first_name}%"),
                                MedicalReport.raw_text.ilike(f"%{clean_username}%"),
                                MedicalReport.raw_text.ilike(f"%{first_name}%"),
                            ),
                        ),
                    )
                )
                .order_by(MedicalReport.uploaded_at.desc())
                .limit(1)
            )
            result = await asyncio.wait_for(db.execute(stmt), timeout=8.0)
            report = result.scalar_one_or_none()

            if report:
                # If report had the old synthetic fallback summary, purge it immediately
                summary = str(report.extracted_biomarkers.get("clinical_summary", "")) if isinstance(report.extracted_biomarkers, dict) else ""
                if "Blood test flags borderline prediabetic fasting glucose" in summary:
                    try:
                        await db.delete(report)
                        await db.commit()
                    except Exception:
                        pass
                    return {
                        "success": True,
                        "has_report": False,
                        "username": clean_username,
                        "message": f"Previous demo report cleared. Please upload your personal lab report.",
                        "parsed_data": None,
                    }

                # If report had username=NULL, claim it permanently for this patient
                if not report.username:
                    try:
                        report.username = clean_username
                        await db.commit()
                    except Exception:
                        pass

                return {
                    "success": True,
                    "has_report": True,
                    "id": str(report.id),
                    "username": clean_username,
                    "file_name": report.file_name,
                    "parsed_data": report.extracted_biomarkers,
                    "uploaded_at": report.uploaded_at.isoformat(),
                }
            else:
                # Logged in user has no report yet -> Do NOT leak or show other users' reports
                return {
                    "success": True,
                    "has_report": False,
                    "username": clean_username,
                    "message": f"No medical reports uploaded yet for @{clean_username}.",
                    "parsed_data": None,
                }
        except Exception as e:
            print(f"[A24 Report Latest Error] {e}")

    # 2. Guest Mode (Not logged in): Look for unassigned report, or return demo sample
    try:
        stmt = (
            select(MedicalReport)
            .where(MedicalReport.username.is_(None))
            .order_by(MedicalReport.uploaded_at.desc())
            .limit(1)
        )
        result = await asyncio.wait_for(db.execute(stmt), timeout=4.0)
        report = result.scalar_one_or_none()
        if report:
            return {
                "success": True,
                "has_report": True,
                "id": str(report.id),
                "file_name": report.file_name,
                "parsed_data": report.extracted_biomarkers,
                "uploaded_at": report.uploaded_at.isoformat(),
            }
    except Exception:
        pass

    # Fallback default report for instant guest demo
    fallback_data = report_parser_agent._fallback_parse("", "Executive_Metabolic_CBC_2026.pdf")
    return {
        "success": True,
        "has_report": False,
        "id": "demo-report-latest",
        "file_name": "Executive_Metabolic_CBC_2026.pdf",
        "parsed_data": fallback_data,
        "uploaded_at": "2026-10-24T10:00:00Z",
    }

@router.post("/clear")
async def clear_user_reports(
    username: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    clean_username = username.strip().lower() if username else None
    if not clean_username:
        return {"success": False, "message": "username required"}

    stmt = select(MedicalReport).where(
        or_(
            MedicalReport.username == clean_username,
            MedicalReport.file_name.ilike(f"%{clean_username}%")
        )
    )
    res = await db.execute(stmt)
    reports = res.scalars().all()
    count = len(reports)
    for r in reports:
        await db.delete(r)
    await db.commit()
    return {"success": True, "deleted_count": count, "username": clean_username}

@router.get("/debug-db")
async def debug_db(db: AsyncSession = Depends(get_db)):
    try:
        stmt = select(MedicalReport).order_by(MedicalReport.uploaded_at.desc())
        result = await asyncio.wait_for(db.execute(stmt), timeout=8.0)
        reports = result.scalars().all()
        return {
            "count": len(reports),
            "reports": [
                {
                    "id": str(r.id),
                    "username": r.username,
                    "file_name": r.file_name,
                    "raw_text_preview": (r.raw_text or "")[:120],
                    "extracted_biomarkers": r.extracted_biomarkers,
                    "uploaded_at": str(r.uploaded_at),
                }
                for r in reports
            ]
        }
    except Exception as e:
        return {"error": str(e)}
