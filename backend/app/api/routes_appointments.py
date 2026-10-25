from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.schema import Appointment
from app.agents.doctor_discovery import doctor_concierge_agent

router = APIRouter()

class ScoutRequest(BaseModel):
    specialty: str = "general physician"
    city: str = "Gorakhpur, Uttar Pradesh"
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class BookAppointmentRequest(BaseModel):
    doctor_name: str
    doctor_email: Optional[str] = "dr.devansh@apexhealthcare.in"
    clinic_address: str
    specialty: str
    patient_name: str = "Ayushman Singh"
    preferred_time: str = "Tomorrow at 10:30 AM"

@router.post("/scout")
async def scout_doctors(req: ScoutRequest):
    doctors = await doctor_concierge_agent.scout_specialists(
        specialty=req.specialty,
        city=req.city,
        latitude=req.latitude,
        longitude=req.longitude,
    )
    return {"success": True, "specialty": req.specialty, "city": req.city, "doctors": doctors}

@router.get("/scout")
@router.get("/doctors")
async def get_scout_doctors(city: str = "Gorakhpur, Uttar Pradesh", specialty: str = "all"):
    doctors = await doctor_concierge_agent.scout_specialists(
        specialty=specialty,
        city=city,
    )
    return {"success": True, "specialty": specialty, "city": city, "doctors": doctors}

@router.post("/book")
async def book_appointment(req: BookAppointmentRequest, db: AsyncSession = Depends(get_db)):
    # 1. Dispatch email
    email_res = await doctor_concierge_agent.dispatch_appointment_request(
        doctor_name=req.doctor_name,
        doctor_email=req.doctor_email or "clinic@metropolitanhealth.org",
        clinic_address=req.clinic_address,
        specialty=req.specialty,
        patient_name=req.patient_name,
        preferred_time=req.preferred_time,
    )

    # 2. Lock calendar
    cal_res = await doctor_concierge_agent.lock_calendar_appointment(
        doctor_name=req.doctor_name,
        clinic_address=req.clinic_address,
        specialty=req.specialty,
    )

    # 3. Save appointment in Neon DB
    new_app = Appointment(
        doctor_name=req.doctor_name,
        specialty=req.specialty,
        clinic_address=req.clinic_address,
        doctor_email=req.doctor_email,
        status="CALENDAR_MARKED" if cal_res.get("success") else "PENDING_EMAIL",
        gmail_thread_id=email_res.get("thread_id"),
        gcal_event_id=cal_res.get("event_id"),
    )
    try:
        db.add(new_app)
        await db.commit()
        await db.refresh(new_app)
        app_id = str(new_app.id)
    except Exception:
        app_id = "demo-app-id"

    return {
        "success": True,
        "appointment_id": app_id,
        "email": email_res,
        "calendar": cal_res,
    }

@router.get("")
async def list_appointments(db: AsyncSession = Depends(get_db)):
    try:
        stmt = select(Appointment).order_by(Appointment.created_at.desc()).limit(10)
        res = await db.execute(stmt)
        appointments = res.scalars().all()
        return [
            {
                "id": str(a.id),
                "doctor_name": a.doctor_name,
                "specialty": a.specialty,
                "clinic_address": a.clinic_address,
                "status": a.status,
                "created_at": a.created_at.isoformat(),
            }
            for a in appointments
        ]
    except Exception:
        return []
