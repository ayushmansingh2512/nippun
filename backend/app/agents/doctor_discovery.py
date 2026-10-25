import json
from typing import Dict, Any, List, Optional
from app.agents.base import BaseAgent
from app.services.places_service import places_service
from app.services.gmail_service import gmail_service
from app.services.gcal_service import gcal_service

class DoctorConciergeAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_id="concierge",
            name="GHOST // DISPATCH",
            role="Doctor Scout & Scheduler",
            avatar_type="ghost"
        )

    async def scout_specialists(
        self,
        specialty: str = "general physician",
        city: str = "Gorakhpur, Uttar Pradesh",
        latitude: float = 26.7606,
        longitude: float = 83.3732,
    ) -> List[Dict[str, Any]]:
        """Tool 1: Find nearby specialists based on coordinates or city."""
        return await places_service.search_specialists(
            specialty=specialty,
            city=city,
            latitude=latitude,
            longitude=longitude,
        )

    async def dispatch_appointment_request(
        self,
        doctor_name: str,
        doctor_email: str,
        clinic_address: str,
        specialty: str,
        patient_name: str = "Ayushman Singh",
        preferred_time: str = "Tomorrow at 10:00 AM",
        clinical_summary: str = "Patient seeking consultation regarding recent blood work flags.",
        oauth_tokens: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Tool 2: Send structured appointment email to clinic."""
        email_res = await gmail_service.send_booking_request_email(
            doctor_email=doctor_email,
            doctor_name=doctor_name,
            patient_name=patient_name,
            specialty=specialty,
            preferred_time=preferred_time,
            clinical_summary=clinical_summary,
            oauth_tokens=oauth_tokens,
        )
        return email_res

    async def lock_calendar_appointment(
        self,
        doctor_name: str,
        clinic_address: str,
        specialty: str,
        oauth_tokens: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Tool 3: Lock event in Google Calendar."""
        cal_res = await gcal_service.schedule_event(
            doctor_name=doctor_name,
            clinic_address=clinic_address,
            specialty=specialty,
            oauth_tokens=oauth_tokens,
        )
        return cal_res

doctor_concierge_agent = DoctorConciergeAgent()
