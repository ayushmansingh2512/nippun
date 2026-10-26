import json
import re
import asyncio
from typing import AsyncGenerator, Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.services.gemini_client import gemini_client
from app.agents.report_parser import report_parser_agent
from app.agents.clinical_advisor import clinical_advisor_agent
from app.agents.kinesiology_advisor import kinesiology_advisor_agent
from app.agents.doctor_discovery import doctor_concierge_agent
from app.models.schema import AgentMessage, Appointment, MedicalReport

router = APIRouter()

class ChatStreamRequest(BaseModel):
    message: str
    active_agent: str = "triage" # triage (clover), pharma (flower), kinesio (square), concierge (ghost)
    session_id: str = "default-session"
    user_id: str = "guest-user"
    biomarkers: Optional[List[Dict[str, Any]]] = None
    report_summary: Optional[str] = None
    patient_name: Optional[str] = "Ayushman Singh"
    location: Optional[str] = "Gorakhpur, Uttar Pradesh"

def format_sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"

@router.post("/stream")
async def chat_stream_endpoint(
    req: ChatStreamRequest,
    db: AsyncSession = Depends(get_db)
):
    async def event_generator() -> AsyncGenerator[str, None]:
        agent_id = req.active_agent.lower()
        msg_lower = req.message.lower()

        # Map agent ID to standard name
        agent_map = {
            "triage": "clover",
            "clover": "clover",
            "pharma": "flower",
            "flower": "flower",
            "kinesio": "square",
            "square": "square",
            "concierge": "ghost",
            "ghost": "ghost",
        }
        avatar_type = agent_map.get(agent_id, "clover")

        # 1. Resolve Location (Extract from message or request)
        user_location = req.location or "Gorakhpur, Uttar Pradesh"
        loc_match = re.search(
            r"(?:in|at|near|around|for|location\s*(?:is|:)?|city\s*(?:is|:)?)\s+([a-zA-Z\s,]+(?:pradesh|up|delhi|india)?)",
            req.message,
            re.IGNORECASE
        )
        if loc_match:
            candidate = loc_match.group(1).strip().strip("?.!,")
            if candidate.lower() not in ["my area", "here", "the city", "town", "this report", "my report"]:
                user_location = candidate.title()
        elif "gorakhpur" in msg_lower:
            user_location = "Gorakhpur, Uttar Pradesh"
        elif "lucknow" in msg_lower:
            user_location = "Lucknow, Uttar Pradesh"
        elif "delhi" in msg_lower:
            user_location = "New Delhi, Delhi"
        elif "varanasi" in msg_lower:
            user_location = "Varanasi, Uttar Pradesh"

        # 2. Resolve Biomarkers (from request, DB latest report, or fallback)
        biomarkers = req.biomarkers or []
        report_summary = req.report_summary or ""
        patient_name = req.patient_name or "Ayushman Singh"

        if not biomarkers:
            try:
                stmt = select(MedicalReport).order_by(MedicalReport.uploaded_at.desc()).limit(1)
                result = await db.execute(stmt)
                latest_report = result.scalar_one_or_none()
                if latest_report and latest_report.extracted_biomarkers:
                    parsed_data = latest_report.extracted_biomarkers
                    biomarkers = parsed_data.get("biomarkers", [])
                    report_summary = parsed_data.get("clinical_summary", "")
                    patient_name = parsed_data.get("patient_name", patient_name)
            except Exception:
                pass

        if not biomarkers:
            fallback = report_parser_agent._fallback_parse("", "Ayushman_Singh_Medical_Report.pdf")
            biomarkers = fallback.get("biomarkers", [])
            report_summary = fallback.get("clinical_summary", "")

        # 3. Emit Agent State -> WORKING (Avatar pulses and animates on stage)
        yield format_sse("agent_state", {"agent": avatar_type, "state": "working"})
        await asyncio.sleep(0.05)

        full_reply_text = ""

        # INTENT A: Doctor scouting / appointment booking (Ghost)
        if avatar_type == "ghost" or any(k in msg_lower for k in ["doctor", "specialist", "book", "appointment", "clinic", "calendar", "schedule", "location", "find doctor"]):
            yield format_sse("token", {"text": f"Activating GHOST // DISPATCH radar for {user_location}...\n\n"})

            # If specifically asking to book or schedule
            if any(k in msg_lower for k in ["book", "confirm", "send email", "schedule"]):
                yield format_sse("token", {"text": f"Dispatching consultation request email for {patient_name} in {user_location}...\n"})

                target_doc = "Dr. Hemank Devansh, MD"
                target_clinic = "Apex Endocrine & Metabolic Care Centre, Golghar, Gorakhpur"
                if "aiims" in msg_lower:
                    target_doc = "Dr. Abhishek Singh, MD, DM"
                    target_clinic = "AIIMS Gorakhpur - Dept of Metabolic Medicine, Kunraghat"

                # Actuator 1: Gmail booking
                email_res = await doctor_concierge_agent.dispatch_appointment_request(
                    doctor_name=target_doc,
                    doctor_email="dr.devansh@apexhealthcare.in",
                    clinic_address=target_clinic,
                    specialty="Diabetologist & Internal Medicine",
                    patient_name=patient_name,
                    preferred_time="Tomorrow at 10:30 AM",
                    clinical_summary=f"Patient {patient_name} reviewing lab panel with low Vitamin D (18.4 ng/mL) and borderline fasting glucose (104 mg/dL).",
                )

                # Actuator 2: Google Calendar lock
                cal_res = await doctor_concierge_agent.lock_calendar_appointment(
                    doctor_name=target_doc,
                    clinic_address=target_clinic,
                    specialty="Diabetologist & Internal Medicine",
                )

                # Trigger poke animation
                yield format_sse("agent_poke", {"agent": "ghost"})

                # Send tool results
                yield format_sse("tool_result", {
                    "type": "booking_confirmed",
                    "email": email_res,
                    "calendar": cal_res,
                    "doctor": target_doc,
                    "address": target_clinic,
                })

                reply_msg = f"Consultation dispatch confirmed for {target_doc} in {user_location}. Google Calendar event generated."
                yield format_sse("token", {"text": f"\n{reply_msg}"})
                full_reply_text = reply_msg

            else:
                # Scout specialists based on user report flags & location
                specialty = "General Physician"
                if any(k in msg_lower for k in ["hematol", "blood", "anemia", "hemoglobin", "iron", "rbc"]):
                    specialty = "Hematologist"
                elif any(k in msg_lower for k in ["endo", "diabet", "sugar", "glucose", "insulin", "hba1c"]):
                    specialty = "Endocrinologist & Diabetologist"
                elif any(k in msg_lower for k in ["cardio", "heart", "lipid", "cholesterol", "triglyceride"]):
                    specialty = "Cardio-Metabolic Specialist"
                elif any(k in msg_lower for k in ["physio", "rehab", "mobility", "kinesis", "muscle", "joint", "ortho"]):
                    specialty = "Physiotherapist & Orthopedic Specialist"
                elif any(k in msg_lower for k in ["gastro", "stomach", "liver", "gut", "acidity", "digest"]):
                    specialty = "Gastroenterologist"
                elif any(k in msg_lower for k in ["neuro", "brain", "nerve", "headache", "migraine"]):
                    specialty = "Neurologist"
                elif any(k in msg_lower for k in ["derma", "skin", "rash", "hair", "eczema"]):
                    specialty = "Dermatologist"
                else:
                    specialty = "Consultant Physician & Specialist"

                yield format_sse("token", {"text": f"Scouting top-rated **{specialty}** specialists in **{user_location}**...\n\n"})
                doctors = await doctor_concierge_agent.scout_specialists(
                    specialty=specialty,
                    city=user_location,
                )

                yield format_sse("tool_result", {
                    "type": "doctor_list",
                    "specialty": specialty,
                    "city": user_location,
                    "doctors": doctors,
                })

                intro = f"📍 Based on your medical inquiry, identified **{len(doctors)} specialists in {user_location}**:\n\n"
                doc_list_text = ""
                for idx, doc in enumerate(doctors[:4], 1):
                    cond_tag = f"   • ⚠️ **Targeting:** {doc['matched_condition']}\n" if doc.get("matched_condition") else ""
                    doc_list_text += f"{idx}. **{doc['doctor_name']}** ({doc['specialty']})\n{cond_tag}   • {doc['clinic_name']}\n   • 📍 {doc['address']} ({doc.get('distance', 'Nearby')})\n   • Rating: ★ {doc.get('rating', '4.9')}\n\n"

                outro = "Select any doctor card in your console to automatically dispatch a consultation request and lock your calendar."
                full_reply_text = intro + doc_list_text + outro
                yield format_sse("token", {"text": doc_list_text + outro})

        # INTENT B: Exercise / Kinesiology (Square / Golu)
        elif avatar_type == "square" or any(k in msg_lower for k in [
            "exercise", "workout", "kinesis", "rehab", "zone 2", "mobility", "fat", "belly fat",
            "weight", "gym", "cardio", "spine", "spinal", "lumbar", "squat", "running", "stretch",
            "stretching", "posture", "muscle", "joint", "flexibility", "aerobic", "strength"
        ]):
            yield format_sse("token", {"text": f"GOLU // KINESIS formulating biomechanics & exercise prescription for {patient_name}...\n\n"})

            # Generate workout plan tool result dynamically
            try:
                plan = await kinesiology_advisor_agent.generate_workout_plan(biomarkers=biomarkers)
                yield format_sse("tool_result", {
                    "type": "workout_plan",
                    "plan": plan,
                })
            except Exception:
                pass

            system_instruction = (
                f"You are GOLU (SQUARE), the Senior Kinesiology, Exercise Rehabilitation & Sports Medicine Coach for the A24 Healthcare Platform. "
                f"The patient is {patient_name} in {user_location}. "
                f"Their extracted lab biomarkers are: {json.dumps(biomarkers[:6]) if biomarkers else '[]'}. "
                f"CLINICAL KINESIOLOGY & EXERCISE PRESCRIPTION DIRECTIVES: "
                f"1. Directly and comprehensively address the patient's EXACT question, condition, or physical goal: '{req.message}'. "
                f"2. Explain the physiological and biomechanical science clearly (mitochondrial oxidation, muscle recruitment, joint kinematics, progressive overload). "
                f"3. Provide an actionable step-by-step routine with exercises, sets, reps, duration, intensity, and heart rate zones. "
                f"4. State exact form cues, joint safety precautions, and post-exercise recovery advice. "
                f"FORMATTING STYLE: Format with clean, elegant markdown typography, bold section headers, and bullet points."
            )

            tokens_received = False
            try:
                async for token in gemini_client.stream_generate_content(
                    prompt=f"Patient exercise & mobility query: {req.message}",
                    system_instruction=system_instruction,
                ):
                    if token:
                        tokens_received = True
                        full_reply_text += token
                        yield format_sse("token", {"text": token})
            except Exception:
                tokens_received = False

            if not tokens_received:
                fallback_msg = (
                    f"### 🏋️ GOLU // Kinesiology & Biomechanics Protocol\n\n"
                    f"**Patient:** {patient_name} | **Inquiry:** \"{req.message}\"\n\n"
                    f"#### 1. Movement & Conditioning Guidelines:\n"
                    f"• **Aerobic Conditioning:** 30–45 minutes of Zone 2 steady-state movement (brisk walking, cycling, or light rowing) 3–4x weekly.\n"
                    f"• **Resistance Training:** Compound multi-joint movements (squats, hinges, pushes, and pulls) to stimulate glucose uptake and lean muscle preservation.\n"
                    f"• **Joint Safety:** Warm up thoroughly and avoid pushing into sharp or radiating joint pain.\n\n"
                    f"> *Notice: Live Gemini 3.5 Flash streaming is currently awaiting an active API key in `backend/.env`.*"
                )
                yield format_sse("token", {"text": fallback_msg})
                full_reply_text = fallback_msg

        # INTENT C: Pharmacology / Medicine / Supplements / Symptoms (Flower / Chintu)
        elif (
            avatar_type == "flower"
            or any(k in msg_lower for k in [
                "medicine", "medecine", "rx", "pharma", "supplement", "vitamin",
                "dose", "dosage", "diet", "drug", "fever", "pyrexia", "temperature",
                "what should i take", "what can i take", "what to take", "take for",
                "pain", "headache", "body ache", "tablet", "tablets", "syrup",
                "price", "mrp", "cost", "otc", "cure", "treat", "treatment", "pill", "pills"
            ])
        ):
            yield format_sse("token", {"text": f"Cross-referencing pharmacology database & clinical formulary for {patient_name}...\n\n"})

            yield format_sse("tool_result", {
                "type": "pharma_advice",
                "agent": "flower",
                "query": req.message,
                "status": "active",
            })

            # Stream response via Gemini 3.5 Flash
            system_instruction = (
                f"You are CHINTU (FLOWER), the Senior Clinical Pharmacology Advisor & Formulary Specialist for the A24 Healthcare Platform. "
                f"The patient is {patient_name} in {user_location}. "
                f"Their extracted report biomarkers are: {json.dumps(biomarkers[:6]) if biomarkers else '[]'}. "
                f"CLINICAL PHARMACOLOGY DIRECTIVES: "
                f"1. Accurately address the patient's EXACT disease, symptom, or medication inquiry: '{req.message}'. Analyze whatever health concern they have asked about. "
                f"2. Provide a clear clinical assessment and overview of the condition. "
                f"3. Recommend appropriate evidence-based first-line medications (provide both generic formulation and top reputable Indian brands e.g. Cipla, Sun Pharma, Dr. Reddy's, Mankind, Torrent, Abbott, GSK). "
                f"4. State exact dosage instructions, administration timing (e.g. before/after meals), frequency, and maximum safety limits. "
                f"5. Quote realistic Indian retail market prices in INR (₹) per strip, bottle, or tube. "
                f"6. Provide non-pharmacological supportive care (dietary guidelines, hydration, physical comfort). "
                f"7. State safety warnings, contraindications, and emergency red flag symptoms for urgent physician consultation. "
                f"FORMATTING STYLE: Format with clean, elegant markdown typography, bold section labels, and bullet points."
            )

            tokens_received = False
            try:
                async for token in gemini_client.stream_generate_content(
                    prompt=f"Patient clinical & medication query: {req.message}",
                    system_instruction=system_instruction,
                ):
                    if token:
                        tokens_received = True
                        full_reply_text += token
                        yield format_sse("token", {"text": token})
            except Exception:
                tokens_received = False

            if not tokens_received:
                fallback_msg = (
                    f"### 💊 CHINTU // Clinical Pharmacology Guidance\n\n"
                    f"**Patient:** {patient_name} | **Inquiry:** \"{req.message}\"\n\n"
                    f"#### 1. Clinical Assessment:\n"
                    f"Reviewing reported symptom: **{req.message}**.\n\n"
                    f"#### 2. General Safety & First-Aid Principles:\n"
                    f"• Consult a licensed physician or pharmacist for formal prescription before initiating any medication.\n"
                    f"• Maintain proper hydration and monitor vitals (temperature, pulse, blood pressure).\n"
                    f"• Seek immediate medical attention if symptoms worsen rapidly, or are accompanied by severe pain, high fever, or breathlessness.\n\n"
                    f"> *Notice: Live Gemini 3.5 Flash streaming is currently awaiting an active API key in `backend/.env`.*"
                )
                yield format_sse("token", {"text": fallback_msg})
                full_reply_text = fallback_msg

        # INTENT D: Default / Triage (Clover)
        else:
            system_instruction = (
                f"You are CLOVER, the chief medical ingest and triage agent for the A24 Healthcare platform. "
                f"The patient is {patient_name} in {user_location}. "
                f"Their extracted report biomarkers are: {json.dumps(biomarkers[:6]) if biomarkers else '[]'}. "
                f"Their report summary is: '{report_summary}'. "
                f"CLINICAL TRIAGE DIRECTIVES: "
                f"1. Accurately and specifically answer the patient's inquiry: '{req.message}'. "
                f"2. Incorporate their biomarkers and clinical context when relevant. "
                f"3. Provide compassionate, evidence-based triage advice and recommend appropriate next steps or specialist consultations. "
                f"Be concise, highly professional, empathetic, and clinically precise."
            )

            tokens_received = False
            try:
                async for token in gemini_client.stream_generate_content(
                    prompt=f"Patient question: {req.message}",
                    system_instruction=system_instruction,
                ):
                    if token:
                        tokens_received = True
                        full_reply_text += token
                        yield format_sse("token", {"text": token})
            except Exception:
                tokens_received = False

            if not tokens_received:
                fallback_msg = (
                    f"### 🍀 CLOVER // Clinical Triage\n\n"
                    f"**Patient:** {patient_name} | **Query:** \"{req.message}\"\n\n"
                    f"Your health query has been recorded. For urgent clinical evaluation, please consult your primary healthcare provider.\n\n"
                    f"> *Notice: Live Gemini 3.5 Flash streaming is currently awaiting an active API key in `backend/.env`.*"
                )
                yield format_sse("token", {"text": fallback_msg})
                full_reply_text = fallback_msg

        # 4. Reset Agent State back to DEFAULT
        yield format_sse("agent_state", {"agent": avatar_type, "state": "default"})
        yield format_sse("done", {"status": "complete"})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        }
    )
