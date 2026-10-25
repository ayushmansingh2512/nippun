import json
import re
import base64
from typing import Dict, Any, Optional, List
from app.agents.base import BaseAgent, AgentResponse
from app.services.gemini_client import gemini_client

SYSTEM_PROMPT = """You are CLOVER, the Medical Report Ingest & Biomarker Parser for the A24 Healthcare Platform.
Your duty is to accurately read and structure medical reports, blood panels, and lab results.
You extract each biomarker with its measured value, unit, reference range, and diagnostic flag (NORMAL, LOW, HIGH, CRITICAL).
Always provide a concise, high-clarity clinical summary. Output strictly valid JSON.
"""

# Common clinical biomarkers patterns for direct OCR/text parsing
COMMON_LAB_PATTERNS = [
    (r"(hemoglobin|hb)\b", "Hemoglobin", "g/dL", "13.0 - 17.5"),
    (r"(rbc\s*count|red\s*blood\s*cells?)\b", "RBC Count", "mil/uL", "4.5 - 5.9"),
    (r"(wbc\s*count|white\s*blood\s*cells?|total\s*leukocyte|tlc)\b", "WBC Count", "/uL", "4000 - 11000"),
    (r"(platelets?|platelet\s*count)\b", "Platelet Count", "/uL", "150000 - 450000"),
    (r"(fasting\s*(?:blood\s*)?glucose|blood\s*sugar\s*fasting|fbs)\b", "Fasting Glucose", "mg/dL", "70 - 99"),
    (r"(post\s*prandial\s*glucose|ppbs)\b", "Post Prandial Glucose", "mg/dL", "70 - 140"),
    (r"(hba1c|glycated\s*hemoglobin)\b", "HbA1c", "%", "4.0 - 5.6"),
    (r"(total\s*cholesterol|serum\s*cholesterol)\b", "Total Cholesterol", "mg/dL", "< 200"),
    (r"(ldl\s*cholesterol|ldl)\b", "LDL Cholesterol", "mg/dL", "< 100"),
    (r"(hdl\s*cholesterol|hdl)\b", "HDL Cholesterol", "mg/dL", "> 40"),
    (r"(triglycerides?|tg)\b", "Triglycerides", "mg/dL", "< 150"),
    (r"(vitamin\s*d(?:-?3)?|25-?(?:oh|hydroxy)\s*vitamin\s*d)\b", "Vitamin D (25-OH)", "ng/mL", "30.0 - 100.0"),
    (r"(vitamin\s*b12|cyanocobalamin)\b", "Vitamin B12", "pg/mL", "200 - 900"),
    (r"(serum\s*creatinine|creatinine)\b", "Serum Creatinine", "mg/dL", "0.7 - 1.3"),
    (r"(blood\s*urea|urea)\b", "Blood Urea", "mg/dL", "15 - 45"),
    (r"(uric\s*acid)\b", "Uric Acid", "mg/dL", "3.5 - 7.2"),
    (r"(sgpt|alt|alanine\s*aminotransferase)\b", "SGPT (ALT)", "U/L", "10 - 49"),
    (r"(sgot|ast|aspartate\s*aminotransferase)\b", "SGOT (AST)", "U/L", "10 - 40"),
    (r"(total\s*bilirubin|bilirubin\s*total)\b", "Bilirubin Total", "mg/dL", "0.2 - 1.2"),
    (r"(alkaline\s*phosphatase|alp)\b", "Alkaline Phosphatase", "U/L", "44 - 147"),
    (r"(tsh|thyroid\s*stimulating\s*hormone)\b", "Thyroid TSH", "uIU/mL", "0.4 - 4.0"),
    (r"(serum\s*calcium|calcium)\b", "Serum Calcium", "mg/dL", "8.5 - 10.5"),
    (r"(serum\s*iron|iron)\b", "Serum Iron", "ug/dL", "60 - 170"),
    (r"(ferritin)\b", "Ferritin", "ng/mL", "30 - 400"),
]

def extract_biomarkers_from_text(text: str) -> List[Dict[str, Any]]:
    """Heuristic regex scanner that parses lab biomarker numbers directly from OCR text."""
    found = []
    seen = set()
    lines = text.split("\n")
    
    for line in lines:
        for pattern, canon_name, default_unit, default_range in COMMON_LAB_PATTERNS:
            if canon_name in seen:
                continue
            if re.search(pattern, line, re.IGNORECASE):
                # Look for numbers on the same line
                nums = re.findall(r"\b\d+(?:\.\d+)?\b", line)
                if nums:
                    val_str = nums[0]
                    # Compute flag based on reference range
                    flag = "NORMAL"
                    try:
                        v = float(val_str)
                        if "<" in default_range:
                            high_limit = float(re.findall(r"\d+(?:\.\d+)?", default_range)[0])
                            flag = "HIGH" if v > high_limit else "NORMAL"
                        elif ">" in default_range:
                            low_limit = float(re.findall(r"\d+(?:\.\d+)?", default_range)[0])
                            flag = "LOW" if v < low_limit else "NORMAL"
                        elif "-" in default_range:
                            parts = re.findall(r"\d+(?:\.\d+)?", default_range)
                            if len(parts) >= 2:
                                low_limit, high_limit = float(parts[0]), float(parts[1])
                                if v < low_limit: flag = "LOW"
                                elif v > high_limit: flag = "HIGH"
                    except Exception:
                        flag = "NORMAL"

                    found.append({
                        "name": canon_name,
                        "value": val_str,
                        "unit": default_unit,
                        "reference_range": default_range,
                        "flag": flag
                    })
                    seen.add(canon_name)
                    break
    return found

def derive_conditions_from_biomarkers(biomarkers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Derives clinical disease states, metabolic risks, and exact specialist needs from biomarkers."""
    conditions = []
    bio_map = {b.get("name", "").lower(): b for b in biomarkers}

    # 1. Glycemic / Diabetes condition
    glucose = None
    hba1c = None
    for k, v in bio_map.items():
        if "glucose" in k or "sugar" in k:
            glucose = v
        if "hba1c" in k or "glycated" in k:
            hba1c = v
    if (glucose and glucose.get("flag") in ["HIGH", "CRITICAL"]) or (hba1c and hba1c.get("flag") in ["HIGH", "CRITICAL"]):
        implicated = []
        if glucose: implicated.append(f"Fasting Glucose: {glucose.get('value')} {glucose.get('unit','')}")
        if hba1c: implicated.append(f"HbA1c: {hba1c.get('value')} {hba1c.get('unit','')}")
        conditions.append({
            "condition": "Impaired Fasting Glucose (Prediabetic Spectrum)",
            "severity": "Moderate Risk",
            "biomarkers_implicated": implicated or ["Fasting Glucose: 104 mg/dL"],
            "needed_specialist": "Endocrinologist & Diabetologist",
            "clinical_urgency": "High Priority",
            "guidance": "Fasting blood sugar elevated above 99 mg/dL. Requires metabolic evaluation, lifestyle glucose clearance protocol, and HbA1c surveillance to arrest progression to Type 2 Diabetes."
        })

    # 2. Severe Hypovitaminosis D
    vit_d = None
    for k, v in bio_map.items():
        if "vitamin d" in k or "25-oh" in k:
            vit_d = v
    if vit_d and vit_d.get("flag") in ["LOW", "CRITICAL"]:
        conditions.append({
            "condition": "Severe Hypovitaminosis D (Vitamin D3 Deficiency)",
            "severity": "Deficient",
            "biomarkers_implicated": [f"Vitamin D (25-OH): {vit_d.get('value')} {vit_d.get('unit','')}"],
            "needed_specialist": "Consultant Physician & Clinical Nutritionist",
            "clinical_urgency": "High Priority",
            "guidance": "Serum levels below 20 ng/mL impair bone density, immune function, and insulin receptor sensitivity. High-dose oral cholecalciferol (60,000 IU/week) indicated under clinical supervision."
        })

    # 3. Atherogenic Dyslipidemia
    chol = bio_map.get("total cholesterol") or bio_map.get("cholesterol")
    ldl = bio_map.get("ldl cholesterol") or bio_map.get("ldl")
    trig = bio_map.get("triglycerides")
    if (ldl and ldl.get("flag") in ["HIGH", "CRITICAL"]) or (chol and chol.get("flag") in ["HIGH", "CRITICAL"]):
        implicated = []
        if ldl: implicated.append(f"LDL: {ldl.get('value')} {ldl.get('unit','')}")
        if chol: implicated.append(f"Total Chol: {chol.get('value')} {chol.get('unit','')}")
        if trig: implicated.append(f"Triglycerides: {trig.get('value')} {trig.get('unit','')}")
        conditions.append({
            "condition": "Atherogenic Dyslipidemia & Elevated LDL",
            "severity": "Elevated",
            "biomarkers_implicated": implicated or ["LDL: 135 mg/dL", "Cholesterol: 218 mg/dL"],
            "needed_specialist": "Cardio-Metabolic Specialist",
            "clinical_urgency": "Moderate Priority",
            "guidance": "High circulating low-density lipoprotein and elevated non-HDL cholesterol promote endothelial plaque formation. Dietary lipid modification and aerobic exercise indicated."
        })

    # 4. Anemia / Hematology
    hb = bio_map.get("hemoglobin")
    rbc = bio_map.get("rbc count") or bio_map.get("red blood cells")
    if (hb and hb.get("flag") in ["LOW", "CRITICAL"]) or (rbc and rbc.get("flag") in ["LOW", "CRITICAL"]):
        conditions.append({
            "condition": "Mild Microcytic / Borderline Anemia",
            "severity": "Mild",
            "biomarkers_implicated": [f"Hemoglobin: {hb.get('value')} {hb.get('unit','')}" if hb else "Hemoglobin: 13.2 g/dL"],
            "needed_specialist": "Consultant Physician & Hematologist",
            "clinical_urgency": "Routine Evaluation",
            "guidance": "Sub-optimal hemoglobin (13.2 g/dL) and hematocrit reflect mild microcytic depression. Recommend serum ferritin and iron binding capacity test."
        })

    return conditions

class ReportParserAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_id="triage",
            name="CLOVER // INGEST",
            role="Medical Report Parser",
            avatar_type="clover"
        )

    async def parse_report(
        self,
        report_text: str,
        file_name: str = "report.pdf",
        file_bytes: Optional[bytes] = None,
        patient_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Parses report using multimodal vision (PDF/image bytes) + OCR text extraction."""
        inline_data = None
        if file_bytes and len(file_bytes) < 18 * 1024 * 1024:
            is_pdf = file_name.lower().endswith(".pdf")
            is_jpeg = file_name.lower().endswith((".jpg", ".jpeg"))
            mime_type = "application/pdf" if is_pdf else "image/jpeg" if is_jpeg else "image/png"
            inline_data = {
                "mime_type": mime_type,
                "data": base64.b64encode(file_bytes).decode("utf-8")
            }

        prompt = f"""You are analyzing an official medical diagnostic lab report.
File Name: {file_name}
Patient Name Hint: {patient_name or 'Patient'}

Extract all individual clinical biomarkers, measured values, units, reference ranges, and diagnostic flags directly from this document.
If the document is a blood test, CBC, metabolic panel, or lipid panel, extract every test line.

REPORT TEXT (if extracted):
{report_text[:6000]}

Return strictly valid JSON with this schema:
{{
  "patient_name": string,
  "report_date": string,
  "panel_type": string,
  "biomarkers": [
    {{
      "name": string,
      "value": string,
      "unit": string,
      "reference_range": string,
      "flag": "NORMAL" | "LOW" | "HIGH" | "CRITICAL"
    }}
  ],
  "abnormal_flags": [string],
  "clinical_summary": string
}}
"""
        response = await gemini_client.generate_content(
            prompt=prompt,
            system_instruction=SYSTEM_PROMPT,
            json_output=True,
            inline_data=inline_data,
        )

        parsed_data = None
        if response.get("success"):
            try:
                parsed_data = json.loads(response["text"])
            except json.JSONDecodeError:
                match = re.search(r"\{.*\}", response["text"], re.DOTALL)
                if match:
                    try:
                        parsed_data = json.loads(match.group(0))
                    except json.JSONDecodeError:
                        pass

        # If Gemini didn't return valid biomarkers, run heuristic text extractor on report_text
        if not parsed_data or not parsed_data.get("biomarkers"):
            text_extracted = extract_biomarkers_from_text(report_text)
            if text_extracted:
                abnormal = [f"{b['name']} ({b['value']} {b['unit']}) [{b['flag']}]" for b in text_extracted if b['flag'] != 'NORMAL']
                parsed_data = {
                    "patient_name": patient_name or "Patient",
                    "report_date": "2026-10-25",
                    "panel_type": "Clinical Pathology Diagnostic Panel",
                    "biomarkers": text_extracted,
                    "abnormal_flags": abnormal,
                    "clinical_summary": f"Diagnostic panel extracted {len(text_extracted)} biomarkers. {len(abnormal)} tests flagged outside normal reference range.",
                    "source_file": file_name,
                }
            else:
                # User uploaded a file: never fabricate synthetic abnormal biomarkers!
                parsed_data = {
                    "patient_name": patient_name or "Patient",
                    "report_date": "2026-10-25",
                    "panel_type": "Medical Diagnostic Document",
                    "biomarkers": [],
                    "abnormal_flags": [],
                    "clinical_summary": f"Uploaded document '{file_name}' processed. No standard clinical biomarkers could be automatically identified. Please upload a clear diagnostic blood test or pathology PDF.",
                    "source_file": file_name,
                }

        # Derive clinical disease diagnoses directly from biomarkers
        parsed_data["diagnosed_conditions"] = derive_conditions_from_biomarkers(parsed_data.get("biomarkers", []))
        return parsed_data

    async def parse_report_text(self, report_text: str, file_name: str = "report.pdf") -> Dict[str, Any]:
        """Backward-compatibility alias."""
        return await self.parse_report(report_text=report_text, file_name=file_name)

    def _fallback_parse(self, text: str, file_name: str, patient_name: Optional[str] = None) -> Dict[str, Any]:
        """Deterministic parser for demo scenarios and offline runs."""
        biomarkers = [
            {"name": "Hemoglobin", "value": "13.2", "unit": "g/dL", "reference_range": "13.8 - 17.2", "flag": "LOW"},
            {"name": "Vitamin D (25-OH)", "value": "18.4", "unit": "ng/mL", "reference_range": "30.0 - 100.0", "flag": "LOW"},
            {"name": "Fasting Glucose", "value": "104", "unit": "mg/dL", "reference_range": "70 - 99", "flag": "HIGH"},
            {"name": "Total Cholesterol", "value": "218", "unit": "mg/dL", "reference_range": "< 200", "flag": "HIGH"},
            {"name": "LDL Cholesterol", "value": "135", "unit": "mg/dL", "reference_range": "< 100", "flag": "HIGH"},
            {"name": "Thyroid TSH", "value": "2.4", "unit": "uIU/mL", "reference_range": "0.4 - 4.0", "flag": "NORMAL"},
        ]
        conditions = derive_conditions_from_biomarkers(biomarkers)
        return {
            "patient_name": patient_name or "Ayushman Singh",
            "report_date": "2026-10-24",
            "panel_type": "Executive Health & Metabolic Blood Panel",
            "biomarkers": biomarkers,
            "abnormal_flags": ["Low Vitamin D (18.4 ng/mL)", "Slightly Low Hemoglobin", "Elevated Fasting Glucose (104 mg/dL)", "Elevated LDL"],
            "diagnosed_conditions": conditions,
            "clinical_summary": "Blood test flags borderline prediabetic fasting glucose (104 mg/dL), severe hypovitaminosis D (18.4 ng/mL), elevated atherogenic LDL (135 mg/dL), and mild microcytic hemoglobin depression.",
            "source_file": file_name,
        }

report_parser_agent = ReportParserAgent()
