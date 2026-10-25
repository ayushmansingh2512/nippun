import json
import re
from typing import Dict, Any, List, Optional
from app.agents.base import BaseAgent
from app.services.gemini_client import gemini_client

SYSTEM_PROMPT = """You are SQUARE, the Kinesiology, Exercise Prescription & Mobility Coach for the A24 Healthcare Platform.
You convert physiological biomarkers, fatigue profiles, and joint health requirements into a structured, progressive weekly training split.
Your prescriptions emphasize Zone 2 mitochondrial conditioning, posterior chain stability, and glucose uptake through muscular contractions.
Output valid JSON.
"""

class KinesiologyAdvisorAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_id="kinesio",
            name="SQUARE // KINESIS",
            role="Exercise & Rehab Coach",
            avatar_type="square"
        )

    async def generate_workout_plan(
        self,
        biomarkers: List[Dict[str, Any]],
        activity_level: str = "moderate"
    ) -> Dict[str, Any]:
        prompt = f"""Design a bespoke 7-day kinesiology schedule based on the user's biomarker profile:
Biomarkers: {json.dumps(biomarkers, indent=2)}
User Activity Level: {activity_level}

Produce a JSON response:
{{
  "focus_objective": string,
  "weekly_schedule": [
    {{
      "day": "Day 1 - Monday",
      "session_type": string,
      "duration": string,
      "exercises": [string],
      "heart_rate_zone": "Zone 2 (60-70% HRmax)" | "Zone 3" | "Rest/Recovery",
      "biomarker_synergy": string
    }}
  ],
  "mobility_protocols": [string],
  "contraindications": [string]
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

        # Fallback 7-day structured protocol
        return {
            "focus_objective": "Glycemic clearance & mitochondrial density enhancement to clear fasting glucose.",
            "weekly_schedule": [
                {
                    "day": "Day 1 - Monday",
                    "session_type": "Zone 2 Low-Intensity Steady State Cardio",
                    "duration": "35 minutes",
                    "exercises": ["Incline Treadmill Walk (10% grade @ 3.2 mph)", "Ergometer Row cooldown"],
                    "heart_rate_zone": "Zone 2 (60-70% HRmax)",
                    "biomarker_synergy": "Stimulates capillary density to enhance peripheral glucose clearance."
                },
                {
                    "day": "Day 2 - Tuesday",
                    "session_type": "Hypertrophy & Insulin Sensitivity Resistance",
                    "duration": "45 minutes",
                    "exercises": ["Goblet Squats (4x10)", "Dumbbell Romanian Deadlift (3x12)", "Dumbbell Chest Press (3x10)", "Pallof Press (3x15s)"],
                    "heart_rate_zone": "Zone 3",
                    "biomarker_synergy": "Major muscle group recruitment forces non-insulin mediated GLUT4 uptake."
                },
                {
                    "day": "Day 3 - Wednesday",
                    "session_type": "Active Mobility & Spinal Decompression",
                    "duration": "25 minutes",
                    "exercises": ["90/90 Hip Switches", "Cat-Camel flow", "Thoracic Spine Foam Rolling", "Dead Hangs (3x45s)"],
                    "heart_rate_zone": "Rest/Recovery",
                    "biomarker_synergy": "Maintains low cortisol to avoid adrenal glucose dumping."
                },
                {
                    "day": "Day 4 - Thursday",
                    "session_type": "Zone 2 Rhythmic Cycling / Jog",
                    "duration": "40 minutes",
                    "exercises": ["Stationary Upright Bike maintaining 125-135 BPM heart rate"],
                    "heart_rate_zone": "Zone 2 (60-70% HRmax)",
                    "biomarker_synergy": "Increases lipid oxidation rate to counter borderline LDL levels."
                },
                {
                    "day": "Day 5 - Friday",
                    "session_type": "Posterior Chain & Core Stability",
                    "duration": "45 minutes",
                    "exercises": ["Kettlebell Swings (4x15)", "Lat Pulldowns (3x12)", "Walking Lunges (3x10/leg)", "Plank hold (3x60s)"],
                    "heart_rate_zone": "Zone 3",
                    "biomarker_synergy": "Stimulates bone density signaling aligned with Vitamin D repletion."
                },
                {
                    "day": "Day 6 - Saturday",
                    "session_type": "Outdoor Nature Ruck or Brisk Walk",
                    "duration": "50 minutes",
                    "exercises": ["Brisk walk in natural sunlight (supports cutaneous Vitamin D3 synthesis)"],
                    "heart_rate_zone": "Zone 1-2",
                    "biomarker_synergy": "UVB sunlight exposure directly enhances natural Vitamin D levels."
                },
                {
                    "day": "Day 7 - Sunday",
                    "session_type": "Rest & Parasympathetic Reset",
                    "duration": "20 minutes",
                    "exercises": ["Box Breathing (4-4-4-4)", "Gentle hamstring stretches", "Contrast shower or sauna"],
                    "heart_rate_zone": "Rest/Recovery",
                    "biomarker_synergy": "Central nervous system replenishment."
                }
            ],
            "mobility_protocols": [
                "10-minute dynamic warm-up before any resistance training.",
                "Hamstring and psoas stretching post-workout to counteract prolonged sitting."
            ],
            "contraindications": [
                "Avoid maximal 1RM lifts until hemoglobin values normalize above 13.8 g/dL.",
                "Do not perform fasted high-intensity interval training if experiencing morning dizziness."
            ]
        }

kinesiology_advisor_agent = KinesiologyAdvisorAgent()
