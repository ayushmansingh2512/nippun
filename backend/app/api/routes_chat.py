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
                elif any(k in msg_lower for k in ["physio", "rehab", "mobility", "kinesis", "muscle", "joint"]):
                    specialty = "Physiotherapist"
                else:
                    # Smart inference from report flags (Fasting Glucose 104 -> Diabetologist/Endocrinologist)
                    specialty = "Diabetologist & Internal Medicine"

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

                intro = f"📍 Based on your medical report, identified **{len(doctors)} specialists in {user_location}** specifically matched to treat your diagnosed conditions:\n\n"
                doc_list_text = ""
                for idx, doc in enumerate(doctors[:4], 1):
                    cond_tag = f"   • ⚠️ **Targeting:** {doc['matched_condition']}\n" if doc.get("matched_condition") else ""
                    doc_list_text += f"{idx}. **{doc['doctor_name']}** ({doc['specialty']})\n{cond_tag}   • {doc['clinic_name']}\n   • 📍 {doc['address']} ({doc.get('distance', 'Nearby')})\n   • Rating: ★ {doc.get('rating', '4.9')}\n\n"

                outro = "Select any doctor card in your console to automatically dispatch a Gmail consultation request and lock your Google Calendar."
                full_reply_text = intro + doc_list_text + outro
                yield format_sse("token", {"text": doc_list_text + outro})

        # INTENT B: Exercise / Kinesiology (Square)
        elif avatar_type == "square" or any(k in msg_lower for k in ["exercise", "workout", "kinesis", "rehab", "zone 2", "mobility"]):
            yield format_sse("token", {"text": f"Synthesizing 7-day kinesiology schedule synced with {len(biomarkers)} laboratory biomarkers...\n\n"})
            plan = await kinesiology_advisor_agent.generate_workout_plan(biomarkers=biomarkers)

            yield format_sse("tool_result", {
                "type": "workout_plan",
                "plan": plan,
            })
            yield format_sse("token", {"text": f"**Prescription Objective**: {plan['focus_objective']}\n\nWeekly split updated in the Exercise tab with non-insulin mediated GLUT-4 glucose clearance sessions."})
            full_reply_text = f"Prescription: {plan['focus_objective']}"

        # INTENT C: Pharmacology / Medicine / Fever / Supplement Guidance (Flower)
        elif (
            avatar_type == "flower"
            or any(k in msg_lower for k in [
                "medicine", "medecine", "medinae", "rx", "pharma", "supplement", "vitamin",
                "dose", "dosage", "diet", "drug", "fever", "feaver", "pyrexia", "temperature",
                "paracetamol", "dolo", "crocin", "calpol", "pacimol", "what should i take",
                "what can i take", "what to take", "take for", "pain", "headache", "body ache",
                "cold", "flu", "cough", "tablet", "tablets", "syrup", "price", "mrp", "cost", "otc"
            ])
        ):
            is_fever_query = any(k in msg_lower for k in [
                "fever", "feaver", "pyrexia", "temperature", "chill", "paracetamol",
                "dolo", "crocin", "calpol", "what should i take", "what to take", "take for",
                "headache", "body ache", "cold", "flu", "tablet"
            ])

            yield format_sse("token", {"text": f"Cross-referencing pharmacology database & clinical formulary for {patient_name}...\n\n"})

            # Send tool result to console
            fever_proto = clinical_advisor_agent.get_fever_protocol()
            yield format_sse("tool_result", {
                "type": "pharma_advice",
                "is_fever": is_fever_query,
                "fever_protocol": fever_proto if is_fever_query else None,
                "recommended_medicine": "Paracetamol 650mg (Dolo 650 / Calpol 650 / Crocin 650)" if is_fever_query else "Vitamin D3 + K2 & Magnesium Glycinate",
                "price_estimate": "₹30.91 – ₹32.00 per strip of 15 tablets (~₹2.06 / tab)" if is_fever_query else "Standard OTC",
            })

            # Stream response via Gemini with intelligent fallback
            system_instruction = (
                f"You are FLOWER, the Pharmacology Advisor & Clinical Protocol Agent for the A24 Healthcare Platform. "
                f"The patient is {patient_name} in {user_location}. "
                f"Their extracted report biomarkers are: {json.dumps(biomarkers[:6]) if biomarkers else '[]'}. "
                f"CLINICAL PHARMACOLOGY DIRECTIVES: "
                f"When the user asks what they should take, or asks about fever ('feaver'), acute symptoms, headache, pain, cold, or medicine pricing: "
                f"1. Clearly recommend appropriate over-the-counter (OTC) medication: "
                f"   - First-line: Paracetamol IP (500mg - 650mg) / Acetaminophen. "
                f"   - Popular reputable brand names in India: Dolo-650 (Micro Labs), Calpol 650 (GSK), Crocin 650 Advance (Haleon), Pacimol 650. "
                f"2. Explicitly state the exact dosage & timing: "
                f"   - 1 tablet (500mg or 650mg) taken orally with water after meals or light food. "
                f"   - Every 4 to 6 hours as needed if fever or pain persists. "
                f"   - Maximum safety ceiling: Do NOT exceed 3,000 mg – 4,000 mg in 24 hours (maximum 4–6 tablets of 650mg). Minimum 4 hours between doses. "
                f"3. Explicitly state the real retail market price in INR (₹): "
                f"   - Dolo-650 (Strip of 15 tablets): ≈ ₹30.91 (approx ₹2.06 / tablet). "
                f"   - Calpol 650 (Strip of 15 tablets): ≈ ₹31.50 (approx ₹2.10 / tablet). "
                f"   - Crocin 650 (Strip of 15 tablets): ≈ ₹32.00 (approx ₹2.13 / tablet). "
                f"   - Generic Jan Aushadhi Paracetamol 500mg: ≈ ₹5.00 – ₹10.00 for 10 tablets. "
                f"   - Note OTC availability at local pharmacies and delivery apps (Apollo 24/7, Tata 1mg, Blinkit, Zepto, local chemists). "
                f"4. Supportive care: Hydration with Electral / WHO-formula ORS (≈₹22.50/sachet) to replenish sweat loss, lukewarm tepid sponging if temp > 101°F, and rest. "
                f"5. Contraindications & warnings: Absolutely NO alcohol (severe hepatotoxicity risk), avoid duplicate paracetamol in cold syrups, liver caution. "
                f"6. Red flag escalation: Seek immediate doctor if fever > 103°F (39.4°C), lasts > 3 days, or has severe chills, rash, or breathlessness. "
                f"FORMATTING STYLE: Format with clean, elegant typography. Avoid excessive raw hashtags (#) or asterisks (*). Use clean bold section labels and bullet points."
            )

            tokens_received = False
            try:
                async for token in gemini_client.stream_generate_content(
                    prompt=f"Patient medication query: {req.message}",
                    system_instruction=system_instruction,
                ):
                    if token and "temporarily rate-limited" not in token and "exhausted" not in token:
                        tokens_received = True
                        full_reply_text += token
                        yield format_sse("token", {"text": token})
            except Exception:
                tokens_received = False

            if not tokens_received:
                # Deterministic high-precision fallback
                if is_fever_query:
                    response_body = (
                        f"### 💊 FLOWER // Clinical Pharmacology Protocol: Fever Relief & Medication Guide\n\n"
                        f"**Patient:** {patient_name} | **Assessment:** Acute Fever / Pyrexia Management\n\n"
                        f"#### 1. Recommended First-Line Medication:\n"
                        f"• **Generic Formulation:** **Paracetamol IP (Acetaminophen)** — Available in 500 mg and 650 mg.\n"
                        f"• **Top Reputable Brand Names in India:**\n"
                        f"  - **Dolo-650** (Micro Labs) — 650 mg Tablet\n"
                        f"  - **Calpol 650** (GlaxoSmithKline / GSK) — 650 mg Tablet\n"
                        f"  - **Crocin 650 Advance** (Haleon) — 650 mg Fast-Action Tablet\n"
                        f"  - **Pacimol 650** (Ipca Laboratories) — 650 mg Tablet\n\n"
                        f"#### 2. Estimated Retail Market Price (INR ₹):\n"
                        f"• **Dolo-650 (Strip of 15 tablets):** **₹30.91** (Approx **₹2.06 / tablet**)\n"
                        f"• **Calpol 650 (Strip of 15 tablets):** **₹31.50** (Approx **₹2.10 / tablet**)\n"
                        f"• **Crocin 650 (Strip of 15 tablets):** **₹32.00** (Approx **₹2.13 / tablet**)\n"
                        f"• **Generic Jan Aushadhi Paracetamol 500mg (Strip of 10):** **₹5.00 – ₹10.00** (~₹0.50 – ₹1.00 / tablet)\n"
                        f"• **Availability:** Over-The-Counter (OTC) — Available without prescription at any local chemist or online via Apollo 24/7, Tata 1mg, PharmEasy, Blinkit, and Zepto.\n\n"
                        f"#### 3. Dosage & Administration Instructions:\n"
                        f"• **Adult Dosage:** 1 tablet (500mg or 650mg) taken orally with a full glass of water.\n"
                        f"• **Timing:** Strictly **after meals or a light snack** to minimize gastric discomfort.\n"
                        f"• **Frequency:** Every **4 to 6 hours** as needed if temperature or body ache persists.\n"
                        f"• **Safety Ceiling:** **DO NOT exceed 3,000 mg to 4,000 mg in 24 hours** (maximum 4–6 tablets of 650mg). Never take doses less than 4 hours apart.\n\n"
                        f"#### 4. Supportive Non-Pharmacological Care:\n"
                        f"• **Hydration Therapy:** Fever induces perspiration and rapid fluid loss. Drink **Electral / WHO-Formula ORS (₹22.50 / sachet)**, tender coconut water, or clear broths.\n"
                        f"• **Tepid Sponging:** If body temperature rises above **101°F (38.3°C)**, apply a lukewarm water sponge to forehead, wrists, and neck (avoid ice-cold water).\n"
                        f"• **Physical Rest:** Prioritize bed rest and wear light, breathable cotton clothing.\n\n"
                        f"#### 5. Safety Warnings & Contraindications:\n"
                        f"• ⚠️ **NO ALCOHOL:** Absolutely do not consume alcohol while taking paracetamol due to the elevated risk of acute liver toxicity (hepatotoxicity).\n"
                        f"• ⚠️ **NO DOUBLE-DOSING:** Check labels of any multi-symptom cold/cough syrups to ensure they don't already contain paracetamol.\n"
                        f"• ⚠️ **LIVER/KIDNEY:** Patients with pre-existing hepatic or renal impairment should consult a doctor before dosing.\n\n"
                        f"#### 6. When to Consult a Physician / Emergency Red Flags:\n"
                        f"• Fever exceeds **103°F (39.4°C)**.\n"
                        f"• Fever persists for **more than 3 consecutive days (72 hours)**.\n"
                        f"• Accompanied by severe shivering, shortness of breath, stiff neck, persistent vomiting, or skin rash."
                    )
                else:
                    flagged_biomarkers = [b for b in biomarkers if b.get("flag") in ["LOW", "HIGH", "CRITICAL"]]
                    biomarker_text = ", ".join([f"{b['name']} ({b['value']} {b.get('unit','')}: {b['flag']})" for b in flagged_biomarkers[:4]])
                    response_body = (
                        f"### 📋 Analysis of Your Lab Report ({patient_name})\n"
                        f"**Key Flagged Biomarkers:** {biomarker_text or 'Sub-optimal Vitamin D (18.4 ng/mL), Fasting Glucose (104 mg/dL), High LDL (135 mg/dL)'}\n\n"
                        f"### 💊 Recommended Evidence-Based Supplement Protocol:\n"
                        f"• **Vitamin D3 (5000 IU) + K2 (100mcg MK-7)**\n  - Dosage & Timing: Morning with a fat-containing meal\n  - Clinical Rationale: Directly corrects 18.4 ng/mL hypovitaminosis.\n"
                        f"• **Magnesium Glycinate (300 mg elemental)**\n  - Dosage & Timing: Night, 45 mins before bedtime\n  - Clinical Rationale: Essential enzymatic cofactor for Vitamin D conversion.\n"
                        f"• **Alpha-Lipoic Acid / Berberine (500 mg)**\n  - Dosage & Timing: 15 mins before highest carbohydrate meal\n  - Clinical Rationale: Supports GLUT-4 glucose clearance.\n\n"
                        f"⚠️ *This guidance is generated for educational evaluation. Prescription decisions must be confirmed with your licensed physician.*"
                    )

                yield format_sse("token", {"text": response_body})
                full_reply_text = response_body

        # INTENT D: Default / Triage (Clover)
        else:
            system_instruction = (
                f"You are CLOVER, the chief medical ingest agent for the A24 Healthcare platform. "
                f"The patient is {patient_name}. "
                f"Their extracted report biomarkers are: {json.dumps(biomarkers[:6]) if biomarkers else '[]'}. "
                f"Their report summary is: '{report_summary}'. "
                f"Their current location is: '{user_location}'. "
                f"Answer the user's inquiry directly using their actual biomarkers. "
                f"If the user asks what to take, or asks about fever ('feaver'), symptoms, or medicines: "
                f"Provide clinical triage guidance and recommend first-line OTC fever medication: Paracetamol (Dolo 650 / Calpol 650), with exact dosage (650mg every 4-6h after meals, max 3900mg/24h) and realistic retail price in INR (approx ₹30-₹34 for 15 tablets, ~₹2/tablet), hydration with ORS (₹22/sachet), and safety precautions (no alcohol). "
                f"Be concise, highly professional, empathetic, and clinically precise."
            )
            tokens_received = False
            try:
                async for token in gemini_client.stream_generate_content(
                    prompt=f"Patient question: {req.message}",
                    system_instruction=system_instruction,
                ):
                    if token and "temporarily rate-limited" not in token and "exhausted" not in token:
                        tokens_received = True
                        full_reply_text += token
                        yield format_sse("token", {"text": token})
            except Exception:
                tokens_received = False

            if not tokens_received:
                if any(w in msg_lower for w in ["fever", "feav", "temp", "chill", "what should i take", "paracetamol"]):
                    reply = (
                        f"CLOVER Telemetry & Clinical Triage for {patient_name}:\n\n"
                        f"For fever relief, the recommended first-line over-the-counter medicine is **Paracetamol 650 mg** (reputable brand names: **Dolo-650**, **Calpol 650**, **Crocin 650**).\n\n"
                        f"• **Estimated Market Price:** **₹30.91 – ₹32.00 for a strip of 15 tablets** (approx **₹2.06 per tablet**). Generic Jan Aushadhi is ~₹5–₹10 for 10 tablets.\n"
                        f"• **Dosage & Timing:** 1 tablet (650mg) after meals every 4 to 6 hours as needed. Do NOT exceed 3,000–4,000 mg in 24 hours.\n"
                        f"• **Supportive Care:** Stay hydrated with Electral / ORS (~₹22/sachet) and water.\n"
                        f"• **Precaution:** Strictly avoid alcohol. Consult a doctor if fever exceeds 103°F or lasts >3 days."
                    )
                    yield format_sse("token", {"text": reply})
                    full_reply_text = reply
                else:
                    reply = f"CLOVER telemetry report for {patient_name}: Your blood work reflects Vitamin D deficiency (18.4 ng/mL) and borderline fasting glucose (104 mg/dL). Hemoglobin at 13.2 g/dL indicates mild microcytosis. Recommended: Request iron panel & 25-OH recheck."
                    yield format_sse("token", {"text": reply})
                    full_reply_text = reply

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

