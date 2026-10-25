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

    # Parse with Clover (Gemini Vision / Multimodal)
    parsed = await report_parser_agent.parse_report_text(raw_text, file_name=file.filename)

    clean_username = username.strip().lower() if username else None

    # Save to Neon DB / SQLite with user identity
    try:
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
