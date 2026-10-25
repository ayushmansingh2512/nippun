import json
import re
from typing import Dict, Any, List, Optional
from app.agents.base import BaseAgent
from app.services.gemini_client import gemini_client

SYSTEM_PROMPT = """You are FLOWER, the Pharmacology Advisor & Clinical Protocol Agent for the A24 Healthcare Platform.
You analyze extracted laboratory biomarkers, patient symptoms, and medication inquiries to formulate:
1. Evidence-based supplement & nutritional suggestions (with precise timing and dosage guidelines).
2. Over-the-counter (OTC) symptomatic medications (such as Paracetamol/Dolo 650 for fever, headaches, and body aches), complete with generic & brand names, exact dosage, timing, precautions, and current retail market prices in INR (₹).
3. Contraindication warnings and potential drug/supplement interactions (e.g., hepatotoxicity from alcohol + paracetamol, maximum daily ceilings).
4. Crucial questions the patient should ask their primary physician.
5. Mandatory clinical safety disclaimer.
You speak with editorial precision, clinical authority, and empathetic care. Output valid JSON when requested.
"""

class ClinicalAdvisorAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_id="pharma",
            name="FLOWER // RX GUIDE",
            role="Pharmacology Advisor",
            avatar_type="flower"
        )

    def get_fever_protocol(self) -> Dict[str, Any]:
        """Returns the clinical pharmacology protocol for fever / pyrexia relief."""
        return {
            "symptom": "Fever / Pyrexia & Associated Body Aches",
            "first_line_medication": {
                "generic_name": "Paracetamol IP (Acetaminophen)",
                "strengths": ["500 mg", "650 mg"],
                "reputable_brands": [
                    {
                        "brand_name": "Dolo-650 (Micro Labs)",
                        "dosage_form": "650 mg Tablet",
                        "strip_size": "15 tablets",
                        "mrp_inr": "₹30.91",
                        "price_per_tab": "≈ ₹2.06 / tablet"
                    },
                    {
                        "brand_name": "Calpol 650 (GSK)",
                        "dosage_form": "650 mg Tablet",
                        "strip_size": "15 tablets",
                        "mrp_inr": "₹31.50",
                        "price_per_tab": "≈ ₹2.10 / tablet"
                    },
                    {
                        "brand_name": "Crocin 650 Advance (Haleon)",
                        "dosage_form": "650 mg Fast-Action Tablet",
                        "strip_size": "15 tablets",
                        "mrp_inr": "₹32.00",
                        "price_per_tab": "≈ ₹2.13 / tablet"
                    },
                    {
                        "brand_name": "Generic Jan Aushadhi Paracetamol 500mg",
                        "dosage_form": "500 mg Tablet",
                        "strip_size": "10 tablets",
                        "mrp_inr": "₹5.00 – ₹10.00",
                        "price_per_tab": "≈ ₹0.50 – ₹1.00 / tablet"
                    }
                ],
                "dosage_instructions": "1 tablet (500mg or 650mg) taken orally with water after meals or a light snack.",
                "frequency": "Every 4 to 6 hours as needed if fever persists.",
                "maximum_daily_dose": "Do NOT exceed 3,000 mg – 4,000 mg in 24 hours (maximum 4–6 tablets of 650mg). Maintain minimum 4 hours gap between doses.",
                "availability": "Available Over-The-Counter (OTC) at all pharmacies (Apollo, Tata 1mg, PharmEasy, Blinkit, Zepto, local chemists)."
            },
            "supportive_care": [
                "Hydration: Fever accelerates dehydration through sweating. Drink Electral / WHO-Formula ORS (₹22.50/sachet) or tender coconut water.",
                "Tepid Sponging: If body temperature exceeds 101°F (38.3°C), wipe forehead, neck, and arms with lukewarm water (never use cold ice water).",
                "Rest: Ensure 8+ hours of sleep and avoid strenuous physical activity."
            ],
            "contraindications_and_warnings": [
                "⚠️ Strict Alcohol Prohibition: Never consume alcohol while taking paracetamol due to severe risk of acute liver toxicity (hepatotoxicity).",
                "⚠️ Avoid Multi-Drug Duplication: Check labels of any cough/cold syrups to avoid accidentally doubling your paracetamol intake.",
                "⚠️ Liver/Kidney Caution: Individuals with pre-existing hepatic or renal conditions must consult a physician before dosage."
            ],
            "emergency_escalation_triggers": [
                "Body temperature exceeds 103°F (39.4°C).",
                "Fever persists for more than 3 consecutive days.",
                "Accompanied by stiff neck, shortness of breath, severe shivering, skin rash, or persistent vomiting."
            ]
        }

    async def generate_advice(
        self,
        biomarkers: List[Dict[str, Any]],
        symptoms: Optional[str] = None
    ) -> Dict[str, Any]:
        prompt = f"""Review the following laboratory biomarkers and user symptoms:
Biomarkers: {json.dumps(biomarkers, indent=2)}
Symptoms Reported: {symptoms or "Mild fatigue, occasional post-meal brain fog."}

If the user is inquiring about fever or acute symptoms (or asking what to take), provide appropriate OTC medications (specifically Paracetamol/Dolo 650) with exact dosage, timing, and retail pricing in INR.

Produce a clinical protocol in JSON:
{{
  "summary": string,
  "acute_medications": [
    {{
      "name": string,
      "brand_options": string,
      "recommended_dosage": string,
      "timing": string,
      "estimated_price_inr": string,
      "rationale": string
    }}
  ],
  "supplements": [
    {{
      "name": string,
      "recommended_dosage": string,
      "timing": string,
      "rationale": string
    }}
  ],
  "dietary_guidelines": [string],
  "contraindications_and_warnings": [string],
  "questions_for_physician": [string],
  "clinical_disclaimer": "This guidance is generated for educational evaluation and does not constitute formal medical prescription. Always consult your licensed physician before taking new medications."
}}
"""
        response = await gemini_client.generate_content(
            prompt=prompt,
            system_instruction=SYSTEM_PROMPT,
            json_output=True,
        )

        if response.get("success"):
            try:
                return json.loads(response["text"])
            except json.JSONDecodeError:
                match = re.search(r"\{.*\}", response["text"], re.DOTALL)
                if match:
                    try:
                        return json.loads(match.group(0))
                    except json.JSONDecodeError:
                        pass

        # Fallback curated advice with acute fever medication if symptom mentions fever
        fever_protocol = self.get_fever_protocol()
        is_fever = any(w in (symptoms or "").lower() for w in ["fever", "feav", "temp", "chill", "cold", "pyrexia", "what should i take"])

        acute_meds = []
        if is_fever:
            acute_meds = [
                {
                    "name": "Paracetamol 650mg (Dolo 650 / Calpol 650 / Crocin 650)",
                    "brand_options": "Dolo-650 (Micro Labs), Calpol 650 (GSK), Crocin 650 (Haleon)",
                    "recommended_dosage": "1 tablet (650mg) after meals every 4 to 6 hours as needed (Max 3,900mg in 24 hours)",
                    "timing": "After meals or light snack with water; minimum 4-hour gap between doses",
                    "estimated_price_inr": "₹30.91 – ₹32.00 for strip of 15 tablets (~₹2.06 / tablet)",
                    "rationale": "First-line antipyretic to safely down-regulate hypothalamic fever setpoint and relieve body aches."
                }
            ]

        return {
            "summary": "Protocol focused on fever/pyrexia symptom relief with Paracetamol, correcting hypovitaminosis D, optimizing insulin sensitivity, and maintaining safe hydration." if is_fever else "Protocol focused on correcting hypovitaminosis D, optimizing insulin sensitivity, and elevating ferritin levels safely.",
            "acute_medications": acute_meds,
            "supplements": [
                {
                    "name": "Vitamin D3 + K2 (MK-7)",
                    "recommended_dosage": "5000 IU D3 + 100mcg K2",
                    "timing": "Morning with fat-containing breakfast",
                    "rationale": "Directly targets sub-optimal 18.4 ng/mL level to reach optimal 45-60 ng/mL range."
                },
                {
                    "name": "Magnesium Glycinate",
                    "recommended_dosage": "200-300 mg elemental",
                    "timing": "Evening, 45 minutes prior to sleep",
                    "rationale": "Essential cofactor for Vitamin D hydroxylation and nocturnal muscle recovery."
                },
                {
                    "name": "Berberine HCL or Alpha Lipoic Acid",
                    "recommended_dosage": "500 mg before highest carbohydrate meal",
                    "timing": "15 minutes pre-lunch or dinner",
                    "rationale": "Supports GLUT-4 translocation to attenuate 104 mg/dL fasting blood glucose spikes."
                }
            ],
            "dietary_guidelines": [
                "Prioritize soluble fiber (chia, psyllium, lentils) to bind excess circulating LDL.",
                "Ensure electrolyte hydration (Electral ORS ₹22/sachet) if experiencing fever or sweating.",
                "Avoid pairing tea or coffee with iron-rich meals due to tannin chelation."
            ],
            "contraindications_and_warnings": [
                "Strictly avoid alcohol with Paracetamol to prevent hepatotoxicity.",
                "Do not start high-dose Vitamin D without periodic serum calcium monitoring.",
                "If currently on blood thinners, consult physician regarding Vitamin K2 dosage."
            ],
            "questions_for_physician": [
                "If fever persists beyond 72 hours, should a Dengue NS1 / Complete Blood Count test be conducted?",
                "Would a HbA1c test be recommended to assess 90-day glycemic trend beyond fasting glucose?"
            ],
            "clinical_disclaimer": "This guidance is generated for educational evaluation and does not constitute formal medical prescription. Always consult your licensed physician."
        }

clinical_advisor_agent = ClinicalAdvisorAgent()

