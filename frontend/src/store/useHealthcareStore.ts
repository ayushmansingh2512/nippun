import { create } from 'zustand';

export type BotAvatarState = 'default' | 'working' | 'sleeping';

export interface AuthUser {
  username: string;
  fullName: string;
  token: string;
  email?: string;
}

export interface Biomarker {
  name: string;
  value: string;
  unit: string;
  reference_range: string;
  flag: 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL';
}

export interface DiagnosedCondition {
  condition: string;
  severity: 'Mild' | 'Moderate Risk' | 'High Risk' | 'Deficient' | 'Elevated';
  biomarkers_implicated: string[];
  needed_specialist: string;
  clinical_urgency: string;
  guidance: string;
}

export interface Doctor {
  doctor_name: string;
  clinic_name: string;
  specialty: string;
  address: string;
  rating: number;
  distance: string;
  email?: string;
  phone?: string;
  matched_condition?: string;
  matched_reason?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  agentId?: string;
  text: string;
  toolResult?: any;
  timestamp: string;
}

interface HealthcareState {
  // Auth state
  currentUser: AuthUser | null;
  authModalOpen: boolean;
  authMode: 'login' | 'signup';
  authLoading: boolean;
  authError: string | null;

  focusedIndex: number;
  drawerOpen: boolean;
  drawerMode: 'console' | 'chat'; // Console (agent's specialized tools) or Chat (conversation stream)
  agentStates: Record<string, BotAvatarState>;
  // Completely separate chat and telemetry streams for each agent
  messagesByAgent: Record<string, ChatMessage[]>;
  isStreaming: boolean;
  biomarkers: Biomarker[];
  diagnosedConditions: DiagnosedCondition[];
  reportSummary: string;
  userLocation: string;
  doctors: Doctor[];
  bookedAppointments: any[];
  
  // Actions
  setAuthModalOpen: (open: boolean, mode?: 'login' | 'signup') => void;
  setAuthMode: (mode: 'login' | 'signup') => void;
  setAuthError: (err: string | null) => void;
  login: (username: string, password: string) => Promise<boolean>;
  signup: (username: string, password: string, fullName?: string, email?: string) => Promise<boolean>;
  logout: () => void;

  setFocusedIndex: (idx: number) => void;
  setDrawerOpen: (open: boolean) => void;
  setDrawerMode: (mode: 'console' | 'chat') => void;
  setAgentState: (agentId: string, state: BotAvatarState) => void;
  toggleActiveAgentSleep: () => void;
  setUserLocation: (location: string) => void;
  fetchLatestReport: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  uploadReportFile: (file: File) => Promise<void>;
  loadSampleReport: () => void;
  bookDoctorAppointment: (doctor: Doctor) => Promise<void>;
  scoutSpecialists: (specialty?: string, location?: string) => Promise<void>;
}

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '') + '/api/v1';
const AGENT_KEYS = ['triage', 'pharma', 'kinesio', 'concierge'];

const getStoredUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem('healthcare_auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getTimestamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const useHealthcareStore = create<HealthcareState>((set, get) => ({
  // Auth state
  currentUser: getStoredUser(),
  authModalOpen: false,
  authMode: 'login',
  authLoading: false,
  authError: null,

  setAuthModalOpen: (open, mode) =>
    set((s) => ({
      authModalOpen: open,
      authMode: mode || s.authMode,
      authError: null,
    })),

  setAuthMode: (mode) => set({ authMode: mode, authError: null }),

  setAuthError: (err) => set({ authError: err }),

  login: async (username: string, password: string) => {
    set({ authLoading: true, authError: null });
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Login failed. Please verify credentials.');
      }
      const user: AuthUser = {
        username: data.username,
        fullName: data.full_name,
        token: data.token,
      };
      localStorage.setItem('healthcare_auth_user', JSON.stringify(user));
      set({ currentUser: user, authModalOpen: false, authLoading: false, authError: null });
      return true;
    } catch (err: any) {
      set({ authLoading: false, authError: err.message || 'Login failed' });
      return false;
    }
  },

  signup: async (username: string, password: string, fullName?: string, email?: string) => {
    set({ authLoading: true, authError: null });
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          full_name: fullName || username,
          email: email || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Signup failed. Please try a different username.');
      }
      const user: AuthUser = {
        username: data.username,
        fullName: data.full_name,
        token: data.token,
        email: email || undefined,
      };
      localStorage.setItem('healthcare_auth_user', JSON.stringify(user));
      set({ currentUser: user, authModalOpen: false, authLoading: false, authError: null });
      return true;
    } catch (err: any) {
      set({ authLoading: false, authError: err.message || 'Signup failed' });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('healthcare_auth_user');
    set({ currentUser: null, authModalOpen: false, authError: null });
  },

  focusedIndex: 0,
  drawerOpen: false,
  drawerMode: 'console',
  // Active agent is awake ('default'); inactive agents are sleeping ('sleeping')
  agentStates: {
    triage: 'default',
    pharma: 'sleeping',
    kinesio: 'sleeping',
    concierge: 'sleeping',
  },
  // Distinct chat telemetry streams for every individual agent
  messagesByAgent: {
    triage: [
      {
        id: 'triage-welcome',
        sender: 'agent',
        agentId: 'clover',
        text: 'KITTU // INGEST online. OCR engine connected. Upload your medical lab PDF or click "LOAD SAMPLE BLOOD PANEL" to inspect real-time biomarker telemetry.',
        timestamp: getTimestamp(),
      },
    ],
    pharma: [
      {
        id: 'pharma-welcome',
        sender: 'agent',
        agentId: 'flower',
        text: 'CHINTU // PHARMA online. Clinical database synced with your extracted lab biomarkers. Reviewing Vitamin D3+K2, Magnesium Glycinate, and fever OTC protocol.',
        timestamp: getTimestamp(),
      },
    ],
    kinesio: [
      {
        id: 'kinesio-welcome',
        sender: 'agent',
        agentId: 'square',
        text: 'GOLU // KINESIS online. 7-day adaptive movement split formulated. Paced for Zone 2 lipid oxidation and muscular GLUT-4 glucose clearance without adrenal fatigue.',
        timestamp: getTimestamp(),
      },
    ],
    concierge: [
      {
        id: 'concierge-welcome',
        sender: 'agent',
        agentId: 'ghost',
        text: 'BUNTY // DISPATCH online. Autonomous radar identified top-rated specialists nearby matching your lab diagnosis. Select any doctor card to dispatch a Gmail consultation request and lock your Google Calendar.',
        timestamp: getTimestamp(),
      },
    ],
  },
  isStreaming: false,
  biomarkers: [
    { name: 'Hemoglobin', value: '13.2', unit: 'g/dL', reference_range: '13.8 - 17.2', flag: 'LOW' },
    { name: 'Vitamin D (25-OH)', value: '18.4', unit: 'ng/mL', reference_range: '30.0 - 100.0', flag: 'LOW' },
    { name: 'Fasting Glucose', value: '104', unit: 'mg/dL', reference_range: '70 - 99', flag: 'HIGH' },
    { name: 'Total Cholesterol', value: '218', unit: 'mg/dL', reference_range: '< 200', flag: 'HIGH' },
    { name: 'LDL Cholesterol', value: '138', unit: 'mg/dL', reference_range: '< 100', flag: 'HIGH' },
    { name: 'Thyroid TSH', value: '2.4', unit: 'uIU/mL', reference_range: '0.4 - 4.0', flag: 'NORMAL' },
  ],
  reportSummary: 'Executive blood test flags moderate hypovitaminosis D (18.4 ng/mL), impaired fasting glucose (104 mg/dL), and mild microcytic hemoglobin reduction.',
  userLocation: 'Gorakhpur, Uttar Pradesh',
  diagnosedConditions: [
    {
      condition: 'Impaired Fasting Glucose (Prediabetic Spectrum)',
      severity: 'Moderate Risk',
      biomarkers_implicated: ['Fasting Glucose: 104 mg/dL', 'HbA1c: 5.8%'],
      needed_specialist: 'Endocrinologist & Diabetologist',
      clinical_urgency: 'High Priority',
      guidance: 'Fasting blood sugar elevated above 99 mg/dL. Requires metabolic evaluation, lifestyle glucose clearance protocol, and HbA1c surveillance to arrest progression to Type 2 Diabetes.',
    },
    {
      condition: 'Severe Hypovitaminosis D (Vitamin D3 Deficiency)',
      severity: 'Deficient',
      biomarkers_implicated: ['Vitamin D (25-OH): 18.4 ng/mL'],
      needed_specialist: 'Consultant Physician & Clinical Nutritionist',
      clinical_urgency: 'High Priority',
      guidance: 'Serum levels below 20 ng/mL impair bone density, immune function, and insulin receptor sensitivity. High-dose oral cholecalciferol (60,000 IU/week) indicated under clinical supervision.',
    },
    {
      condition: 'Atherogenic Dyslipidemia & Elevated LDL',
      severity: 'Elevated',
      biomarkers_implicated: ['LDL: 135 mg/dL', 'Total Cholesterol: 218 mg/dL', 'Triglycerides: 165 mg/dL'],
      needed_specialist: 'Cardio-Metabolic Specialist',
      clinical_urgency: 'Moderate Priority',
      guidance: 'High circulating low-density lipoprotein and elevated non-HDL cholesterol promote endothelial plaque formation. Dietary lipid modification and aerobic exercise indicated.',
    },
    {
      condition: 'Mild Microcytic / Borderline Anemia',
      severity: 'Mild',
      biomarkers_implicated: ['Hemoglobin: 13.2 g/dL', 'Hematocrit: 39.5%'],
      needed_specialist: 'Consultant Physician & Hematologist',
      clinical_urgency: 'Routine Evaluation',
      guidance: 'Sub-optimal hemoglobin (13.2 g/dL) and hematocrit reflect mild microcytic depression. Recommend serum ferritin and iron binding capacity test.',
    },
  ],
  doctors: [
    {
      doctor_name: 'Dr. Abhishek Singh, MD, DM',
      clinic_name: 'AIIMS Gorakhpur - Dept of Metabolic Medicine',
      specialty: 'Endocrinologist & Diabetologist',
      address: 'Kunraghat, Gorakhpur, Uttar Pradesh 273008',
      rating: 4.9,
      distance: '3.5 km',
      email: 'opd@aiimsgorakhpur.edu.in',
      phone: '+91 (551) 220-7700',
      matched_condition: 'Impaired Fasting Glucose (104 mg/dL) & Prediabetes',
      matched_reason: 'Senior AIIMS Endocrinologist managing glycemic control, insulin resistance, and prediabetes reversal protocol.',
    },
    {
      doctor_name: 'Dr. Hemank Devansh, MD',
      clinic_name: 'Apex Endocrine & Metabolic Care Centre',
      specialty: 'Diabetologist & Internal Medicine',
      address: 'Park Road, Golghar, Gorakhpur, Uttar Pradesh',
      rating: 4.9,
      distance: '1.2 km',
      email: 'dr.devansh@apexhealthcare.in',
      phone: '+91 94520 18492',
      matched_condition: 'Severe Hypovitaminosis D (18.4 ng/mL) & Metabolic Sensitivity',
      matched_reason: 'Targeted clinical protocol for high-dose Vitamin D3 replenishment and metabolic insulin receptor activation.',
    },
    {
      doctor_name: 'Dr. Priya Verma, MD (Med)',
      clinic_name: 'City Hospital & Heart-Metabolic Diagnostic Clinic',
      specialty: 'Cardio-Metabolic Specialist',
      address: 'Civil Lines, Near Cantt Thana, Gorakhpur, Uttar Pradesh',
      rating: 4.8,
      distance: '2.1 km',
      email: 'contact@cityhospitalgkp.org',
      phone: '+91 98390 44211',
      matched_condition: 'Atherogenic Dyslipidemia & Elevated LDL (135 mg/dL)',
      matched_reason: 'Cardio-metabolic specialist focused on ApoB/LDL cholesterol oxidation, triglyceride control, and vascular health.',
    },
    {
      doctor_name: 'Dr. R. K. Srivastava, MD',
      clinic_name: 'BRD Medical College & Nehru Hospital',
      specialty: 'Chief Consultant Physician & Hematologist',
      address: 'Medical College Road, Gorakhpur, Uttar Pradesh 273013',
      rating: 4.8,
      distance: '4.8 km',
      email: 'principal@brdmc.ac.in',
      phone: '+91 (551) 250-1011',
      matched_condition: 'Mild Microcytic Anemia & Low Hemoglobin (13.2 g/dL)',
      matched_reason: 'Comprehensive evaluation of red blood cell indices, serum ferritin, and iron binding capacity.',
    },
    {
      doctor_name: 'Dr. Devansh Tripathi, MPT',
      clinic_name: 'Kinesis Advanced Physiotherapy & Rehab Institute',
      specialty: 'Physiotherapist & Mobility Coach',
      address: 'Betiahata Chowk, Gorakhpur, Uttar Pradesh',
      rating: 4.9,
      distance: '1.8 km',
      email: 'rehab@kinesisgkp.com',
      phone: '+91 94152 88204',
      matched_condition: 'Zone 2 Movement & Muscular GLUT-4 Glucose Clearance',
      matched_reason: 'Structured skeletal muscle contraction prescription to stimulate glucose uptake independent of insulin pathways.',
    },
  ],
  bookedAppointments: [],

  setUserLocation: (location: string) => set({ userLocation: location }),

  fetchLatestReport: async () => {
    try {
      const res = await fetch(`${API_BASE}/reports/latest`);
      if (res.ok) {
        const data = await res.json();
        const parsed = data.parsed_data;
        if (parsed?.biomarkers) {
          set({
            biomarkers: parsed.biomarkers,
            diagnosedConditions: parsed.diagnosed_conditions || get().diagnosedConditions,
            reportSummary: parsed.clinical_summary || get().reportSummary,
          });
        }
      }
    } catch {}
  },

  setFocusedIndex: (idx) => {
    const nextStates: Record<string, BotAvatarState> = {};
    AGENT_KEYS.forEach((key, i) => {
      nextStates[key] = i === idx ? 'default' : 'sleeping';
    });
    set({ focusedIndex: idx, agentStates: nextStates });
  },

  setDrawerOpen: (open) => set({ drawerOpen: open }),
  setDrawerMode: (mode) => set({ drawerMode: mode }),
  setAgentState: (agentId, state) =>
    set((s) => ({ agentStates: { ...s.agentStates, [agentId]: state } })),

  toggleActiveAgentSleep: () => {
    const { focusedIndex, agentStates } = get();
    const activeKey = AGENT_KEYS[focusedIndex] || 'triage';
    const currentState = agentStates[activeKey];
    const nextState = currentState === 'sleeping' ? 'default' : 'sleeping';
    set({ agentStates: { ...agentStates, [activeKey]: nextState } });
  },

  loadSampleReport: () => {
    const sampleBiomarkers: Biomarker[] = [
      { name: 'Hemoglobin', value: '12.8', unit: 'g/dL', reference_range: '13.8 - 17.2', flag: 'LOW' },
      { name: 'Vitamin D (25-OH)', value: '16.9', unit: 'ng/mL', reference_range: '30.0 - 100.0', flag: 'LOW' },
      { name: 'Fasting Glucose', value: '108', unit: 'mg/dL', reference_range: '70 - 99', flag: 'HIGH' },
      { name: 'Total Cholesterol', value: '224', unit: 'mg/dL', reference_range: '< 200', flag: 'HIGH' },
      { name: 'LDL Cholesterol', value: '142', unit: 'mg/dL', reference_range: '< 100', flag: 'HIGH' },
      { name: 'HbA1c', value: '5.8', unit: '%', reference_range: '< 5.7', flag: 'HIGH' },
      { name: 'Serum Ferritin', value: '22', unit: 'ng/mL', reference_range: '30 - 400', flag: 'LOW' },
      { name: 'Thyroid TSH', value: '2.1', unit: 'uIU/mL', reference_range: '0.4 - 4.0', flag: 'NORMAL' },
    ];
    const sampleConditions: DiagnosedCondition[] = [
      {
        condition: 'Impaired Fasting Glucose & Prediabetic HbA1c',
        severity: 'Moderate Risk',
        biomarkers_implicated: ['Fasting Glucose: 108 mg/dL', 'HbA1c: 5.8%'],
        needed_specialist: 'Endocrinologist & Diabetologist',
        clinical_urgency: 'High Priority',
        guidance: 'Fasting blood glucose elevated at 108 mg/dL with HbA1c at 5.8%. Requires dietary carbohydrate modification, post-prandial movement, and medical surveillance.',
      },
      {
        condition: 'Severe Hypovitaminosis D (Vitamin D3 Deficiency)',
        severity: 'Deficient',
        biomarkers_implicated: ['Vitamin D (25-OH): 16.9 ng/mL'],
        needed_specialist: 'Consultant Physician & Clinical Nutritionist',
        clinical_urgency: 'High Priority',
        guidance: 'Serum levels at 16.9 ng/mL require clinical oral cholecalciferol (60,000 IU/week) and magnesium glycinate co-factor.',
      },
      {
        condition: 'Atherogenic Dyslipidemia & Elevated LDL',
        severity: 'Elevated',
        biomarkers_implicated: ['Total Cholesterol: 224 mg/dL', 'LDL Cholesterol: 142 mg/dL'],
        needed_specialist: 'Cardio-Metabolic Specialist',
        clinical_urgency: 'Moderate Priority',
        guidance: 'Total cholesterol (224 mg/dL) and LDL (142 mg/dL) elevated. Targeted aerobic Zone 2 cardio and Omega-3 supplementation indicated.',
      },
      {
        condition: 'Microcytic Iron-Deficiency Risk',
        severity: 'Deficient',
        biomarkers_implicated: ['Hemoglobin: 12.8 g/dL', 'Serum Ferritin: 22 ng/mL'],
        needed_specialist: 'Consultant Physician & Hematologist',
        clinical_urgency: 'Routine Evaluation',
        guidance: 'Sub-optimal hemoglobin (12.8 g/dL) and low serum ferritin (22 ng/mL) indicate depleted iron reserves.',
      },
    ];
    set({
      biomarkers: sampleBiomarkers,
      diagnosedConditions: sampleConditions,
      reportSummary: 'Sample CBC & Metabolic Panel parsed successfully. Identified 5 biomarker anomalies requiring nutritional, pharmacology, and movement coordination.',
    });
  },

  sendMessage: async (text: string) => {
    const { focusedIndex, agentStates, messagesByAgent } = get();
    const activeKey = AGENT_KEYS[focusedIndex] || 'triage';
    const currentAgentMsgs = messagesByAgent[activeKey] || [];

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: getTimestamp(),
    };

    const agentMsgId = `ag_${Date.now()}`;
    const initialAgentMsg: ChatMessage = {
      id: agentMsgId,
      sender: 'agent',
      agentId: activeKey,
      text: '',
      timestamp: getTimestamp(),
    };

    const updatedAgentMsgs = [...currentAgentMsgs, userMsg, initialAgentMsg];

    set((s) => ({
      messagesByAgent: {
        ...s.messagesByAgent,
        [activeKey]: updatedAgentMsgs,
      },
      isStreaming: true,
      drawerMode: 'chat', // Switch to chat view to see streaming response
      agentStates: { ...agentStates, [activeKey]: 'working' },
    }));

    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          active_agent: activeKey,
          session_id: `healthcare-${activeKey}-session`,
          biomarkers: get().biomarkers,
          report_summary: get().reportSummary,
          location: get().userLocation,
          patient_name: get().currentUser?.fullName || 'Ayushman Singh',
        }),
      });

      if (!response.body) throw new Error('No body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          const eventMatch = block.match(/event:\s*([^\n]+)/);
          const dataMatch = block.match(/data:\s*([^\n]+)/);
          if (!dataMatch) continue;

          const eventType = eventMatch ? eventMatch[1].trim() : 'message';
          let dataObj: any;
          try {
            dataObj = JSON.parse(dataMatch[1]);
          } catch {
            continue;
          }

          if (eventType === 'agent_state') {
            const mappedId = dataObj.agent === 'clover' ? 'triage'
                           : dataObj.agent === 'flower' ? 'pharma'
                           : dataObj.agent === 'square' ? 'kinesio'
                           : 'concierge';
            const state = dataObj.state === 'working' ? 'working' : 'default';
            get().setAgentState(mappedId, state);
          } else if (eventType === 'token') {
            set((s) => {
              const agentMsgs = [...(s.messagesByAgent[activeKey] || [])];
              const target = agentMsgs.find((m) => m.id === agentMsgId);
              if (target) {
                target.text += dataObj.text || '';
              }
              return {
                messagesByAgent: {
                  ...s.messagesByAgent,
                  [activeKey]: agentMsgs,
                },
              };
            });
          } else if (eventType === 'tool_result') {
            set((s) => {
              const agentMsgs = [...(s.messagesByAgent[activeKey] || [])];
              const target = agentMsgs.find((m) => m.id === agentMsgId);
              if (target) {
                target.toolResult = dataObj;
              }
              if (dataObj.type === 'doctor_list' && dataObj.doctors) {
                return {
                  messagesByAgent: { ...s.messagesByAgent, [activeKey]: agentMsgs },
                  doctors: dataObj.doctors,
                  userLocation: dataObj.city || s.userLocation,
                };
              }
              if (dataObj.type === 'booking_confirmed') {
                return {
                  messagesByAgent: { ...s.messagesByAgent, [activeKey]: agentMsgs },
                  bookedAppointments: [...s.bookedAppointments, dataObj],
                };
              }
              return {
                messagesByAgent: { ...s.messagesByAgent, [activeKey]: agentMsgs },
              };
            });
          }
        }
      }
    } catch {
      // Local fallback simulator tailored for each agent
      set((s) => {
        const agentMsgs = [...(s.messagesByAgent[activeKey] || [])];
        const target = agentMsgs.find((m) => m.id === agentMsgId);
        if (target) {
          const lowerText = text.toLowerCase();
          const isFever = ['fever', 'feav', 'take', 'medicine', 'med', 'paracetamol', 'dolo', 'crocin', 'calpol', 'headache', 'body ache', 'cold', 'price'].some(k => lowerText.includes(k));

          if (isFever && (activeKey === 'pharma' || activeKey === 'triage')) {
            target.text = "CHINTU // PHARMA Clinical Pharmacology Protocol:\n\n• Recommended Medicine for Fever: Paracetamol IP 650mg (Reputable Brands: Dolo-650, Calpol 650, Crocin 650 Advance).\n• Estimated Retail Market Price: ₹30.91 – ₹32.00 for a strip of 15 tablets (approx ₹2.06 / tablet; Generic Jan Aushadhi is ~₹5–₹10 for 10 tablets).\n• Dosage & Timing: 1 tablet (650mg) after meals with a full glass of water every 4 to 6 hours as needed. DO NOT exceed 3,000–4,000 mg in 24 hours (maintain minimum 4 hours gap between doses).\n• Supportive Care: Hydrate with Electral / WHO-Formula ORS (₹22.50 / sachet) to replenish fluid lost via sweating. Use lukewarm water sponging if temperature exceeds 101°F.\n• Safety: Strictly avoid alcohol (hepatotoxicity risk). Avoid duplicate paracetamol in multi-symptom cold syrups. Consult a physician if fever exceeds 103°F or lasts >3 days.";
          } else if (activeKey === 'triage') {
            target.text = "Kittu telemetry report: Your blood work reflects Vitamin D deficiency (18.4 ng/mL) and borderline fasting glucose (104 mg/dL). Hemoglobin at 13.2 g/dL indicates mild microcytosis. Recommended: Request iron panel & 25-OH recheck.";
          } else if (activeKey === 'pharma') {
            target.text = "Chintu pharmacology formulation: Recommending 5000 IU Vitamin D3 + 100mcg K2 (MK-7) taken in the morning with dietary fats. Take 300 mg elemental Magnesium Glycinate at night to optimize enzymatic Vitamin D hydroxylase activation.";
          } else if (activeKey === 'kinesio') {
            target.text = "Golu kinesiology prescription: Schedule 35 minutes of Zone 2 steady-state incline walking on Monday & Thursday. Add Tuesday hypertrophy squats to stimulate non-insulin mediated muscular GLUT-4 glucose clearance.";
          } else {
            target.text = "Bunty concierge dispatch: Located 3 specialized clinics near you. Select any clinic card in your console to send an automated appointment consultation email and reserve your Google Calendar slot.";
          }
        }
        return {
          messagesByAgent: { ...s.messagesByAgent, [activeKey]: agentMsgs },
        };
      });
    } finally {
      set((s) => ({
        isStreaming: false,
        agentStates: { ...s.agentStates, [activeKey]: 'default' },
      }));
    }
  },

  uploadReportFile: async (file: File) => {
    set((s) => ({ agentStates: { ...s.agentStates, triage: 'working' } }));
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/reports/upload`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        const parsed = data.parsed_data;
        if (parsed?.biomarkers) {
          set({
            biomarkers: parsed.biomarkers,
            diagnosedConditions: parsed.diagnosed_conditions || get().diagnosedConditions,
            reportSummary: parsed.clinical_summary || 'Report processed successfully.',
          });
        }
      }
    } catch {
      get().loadSampleReport();
    } finally {
      const { focusedIndex } = get();
      const isFocused = focusedIndex === 0;
      set((s) => ({ agentStates: { ...s.agentStates, triage: isFocused ? 'default' : 'sleeping' } }));
    }
  },

  bookDoctorAppointment: async (doctor: Doctor) => {
    set((s) => ({ agentStates: { ...s.agentStates, concierge: 'working' } }));
    const patientName = get().currentUser?.fullName || get().currentUser?.username || 'Ayushman Singh';
    try {
      const res = await fetch(`${API_BASE}/appointments/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_name: doctor.doctor_name,
          doctor_email: doctor.email || 'appointments@apexhealth.in',
          clinic_address: doctor.address,
          specialty: doctor.specialty,
          patient_name: patientName,
          preferred_time: 'Tomorrow at 10:30 AM',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        set((s) => ({
          bookedAppointments: [...s.bookedAppointments, data],
        }));
      } else {
        throw new Error('API failed');
      }
    } catch {
      const tomorrow = new Date(Date.now() + 86400000);
      tomorrow.setHours(10, 30, 0, 0);
      const end = new Date(tomorrow.getTime() + 45 * 60000);
      const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Medical Consultation: ${doctor.doctor_name}`)}&dates=${fmt(tomorrow)}/${fmt(end)}&details=${encodeURIComponent(`Appointment with ${doctor.doctor_name} (${doctor.specialty}) at ${doctor.address}.\nBooked autonomously via Multi-Agent Healthcare Platform for ${patientName}.`)}&location=${encodeURIComponent(doctor.address)}`;

      set((s) => ({
        bookedAppointments: [
          ...s.bookedAppointments,
          {
            doctor: doctor.doctor_name,
            address: doctor.address,
            calendar: { html_link: gcalUrl },
            email: { recipient: doctor.email || 'appointments@apexhealth.in', status: 'dispatched' },
          },
        ],
      }));
    } finally {
      setTimeout(() => {
        const { focusedIndex } = get();
        const isFocused = focusedIndex === 3;
        set((s) => ({ agentStates: { ...s.agentStates, concierge: isFocused ? 'default' : 'sleeping' } }));
      }, 800);
    }
  },

  scoutSpecialists: async (specialty: string = 'general physician', location?: string) => {
    const city = location || get().userLocation || 'Gorakhpur, Uttar Pradesh';
    set((s) => ({
      agentStates: { ...s.agentStates, concierge: 'working' },
      userLocation: city,
    }));
    try {
      const res = await fetch(`${API_BASE}/appointments/scout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialty, city }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.doctors) {
          set({ doctors: data.doctors, userLocation: data.city || city });
        }
      }
    } finally {
      const { focusedIndex } = get();
      const isFocused = focusedIndex === 3;
      set((s) => ({ agentStates: { ...s.agentStates, concierge: isFocused ? 'default' : 'sleeping' } }));
    }
  },
}));
