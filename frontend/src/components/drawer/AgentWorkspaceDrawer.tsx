import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { BotAvatar } from 'bot-avatars';
import { useHealthcareStore, Doctor } from '../../store/useHealthcareStore';
import {
  X,
  FileText,
  Activity,
  Calendar,
  Send,
  Upload,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  Pill,
  Dumbbell,
  MessageSquare,
  LayoutGrid,
  MapPin,
  Search,
} from 'lucide-react';

export interface HealthcareAgent {
  id: string;
  name: string;
  role: string;
  specialty: string;
  avatarType: 'clover' | 'flower' | 'square' | 'ghost' | 'pebble' | 'cat';
  face?: 'eyes' | 'mouth';
  color: string;
  model: string;
  capabilities: string[];
  glasses?: 'round' | 'square' | 'shades';
  hat?: 'beret' | 'beanie' | 'party' | 'crown';
  headphones?: boolean;
  bowTie?: boolean;
  accessoryColor?: string;
}

export const AgentWorkspaceDrawer: React.FC<{
  activeAgent: HealthcareAgent;
  allAgents?: HealthcareAgent[];
  currentIndex?: number;
  onSelectAgent?: (index: number) => void;
  onClose: () => void;
}> = ({ activeAgent, allAgents, currentIndex, onSelectAgent, onClose }) => {
  const {
    currentUser,
    drawerMode,
    setDrawerMode,
    agentStates,
    setAgentState,
    messagesByAgent,
    sendMessage,
    isStreaming,
    biomarkers,
    diagnosedConditions,
    reportSummary,
    uploadReportFile,
    loadSampleReport,
    userLocation,
    setUserLocation,
    doctors,
    bookDoctorAppointment,
    bookedAppointments,
    scoutSpecialists,
  } = useHealthcareStore();

  const [inputVal, setInputVal] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [locationInput, setLocationInput] = useState(userLocation || 'Gorakhpur, Uttar Pradesh');
  const [selectedSpecialty, setSelectedSpecialty] = useState('Diabetologist & Internal Medicine');

  // Direct Escape key listener to close drawer immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  React.useEffect(() => {
    if (userLocation) {
      setLocationInput(userLocation);
    }
  }, [userLocation]);

  const handleSearchDoctors = (spec?: string, loc?: string) => {
    const s = spec || selectedSpecialty;
    const l = loc || locationInput;
    setUserLocation(l);
    scoutSpecialists(s, l);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isStreaming) return;
    const msg = inputVal;
    setInputVal('');
    await sendMessage(msg);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    await uploadReportFile(file);
    setUploadLoading(false);
  };

  // Dynamically extract key patient biomarkers from the verified medical lab record
  const glucoseMarker = biomarkers.find((b) => /glucose|sugar|hba1c/i.test(b.name));
  const vitDMarker = biomarkers.find((b) => /vitamin d|25-oh/i.test(b.name));
  const lipidMarker = biomarkers.find((b) => /cholesterol|ldl|lipid/i.test(b.name));
  const rbcMarker = biomarkers.find((b) => /hemoglobin|ferritin|iron/i.test(b.name));
  const thyroidMarker = biomarkers.find((b) => /tsh|thyroid/i.test(b.name));

  // Dynamically generate targeted pharmacological & supplement recommendations based on active lab telemetry
  const dynamicSupplements = [
    ...(vitDMarker
      ? [
        {
          name: `Cholecalciferol Vitamin D3 (60,000 IU/wk or 5,000 IU/day) + K2 (100mcg MK-7)`,
          timing: 'Morning with dietary healthy fats (eggs, nuts, whole milk)',
          rationale: `Directly formulated to correct your baseline serum 25-OH of ${vitDMarker.value} ${vitDMarker.unit} (${vitDMarker.flag}). Restores optimal 45–60 ng/mL immune and musculoskeletal baseline.`,
          badge: vitDMarker.flag === 'LOW' ? 'High Priority Deficiency' : 'Maintenance Protocol',
        },
        {
          name: 'Magnesium Glycinate (300 mg elemental)',
          timing: 'Night, 45 minutes prior to sleep',
          rationale: `Essential enzymatic cofactor required for hepatic 25-hydroxylase conversion of Vitamin D3 (patient level: ${vitDMarker.value} ${vitDMarker.unit}).`,
          badge: 'Enzymatic Co-Factor',
        },
      ]
      : []),
    ...(glucoseMarker
      ? [
        {
          name: 'Alpha Lipoic Acid (600 mg) + Berberine HCl / Chromium',
          timing: '15 minutes before highest carbohydrate meal of the day',
          rationale: `Calibrated specifically for your ${glucoseMarker.name} of ${glucoseMarker.value} ${glucoseMarker.unit} (${glucoseMarker.flag}). Stimulates peripheral GLUT-4 translocation to blunt glycemic spikes.`,
          badge: glucoseMarker.flag === 'HIGH' ? 'Glycemic Sensitivity Flag' : 'Metabolic Support',
        },
      ]
      : []),
    ...(lipidMarker
      ? [
        {
          name: 'High-Concentration Omega-3 EPA/DHA (2,000 mg) + CoQ10 (100 mg)',
          timing: 'With lunch or evening dinner',
          rationale: `Formulated to treat circulating atherogenic lipid markers (${lipidMarker.name}: ${lipidMarker.value} ${lipidMarker.unit}, ${lipidMarker.flag}). Reduces vascular inflammation and endothelial oxidative stress.`,
          badge: lipidMarker.flag === 'HIGH' ? 'Cardio-Metabolic Flag' : 'Lipid Maintenance',
        },
      ]
      : []),
    ...(rbcMarker
      ? [
        {
          name: 'Liposomal Iron / Ferrous Bisglycinate (30 mg) + Vitamin C (500 mg)',
          timing: 'Mid-morning on an empty stomach with water or citrus fruit',
          rationale: `Indicated for sub-optimal ${rbcMarker.name} (${rbcMarker.value} ${rbcMarker.unit}, ${rbcMarker.flag}) to accelerate erythrocyte hemoglobin synthesis without GI distress.`,
          badge: rbcMarker.flag === 'LOW' ? 'Hematologic Recovery' : 'Oxygen Transport',
        },
      ]
      : []),
    ...(thyroidMarker && thyroidMarker.flag !== 'NORMAL'
      ? [
        {
          name: 'Selenium (200 mcg) + Zinc Bisglycinate (15 mg)',
          timing: 'Morning post-breakfast',
          rationale: `Supports peripheral T4 to active T3 conversion for thyroid health (${thyroidMarker.name}: ${thyroidMarker.value} ${thyroidMarker.unit}).`,
          badge: 'Endocrine Support',
        },
      ]
      : []),
  ];

  // Dynamic Movement Prescriptions tailored to active lab biomarkers for Abhishek
  const dynamicMovementProtocols = [
    {
      title: 'GLUT-4 Muscular Glucose Disposal Protocol',
      biomarkerRef: glucoseMarker ? `${glucoseMarker.name}: ${glucoseMarker.value} ${glucoseMarker.unit} (${glucoseMarker.flag})` : 'Fasting Glucose Surveillance',
      protocol: 'Post-Prandial 15-Minute Brisk Walks & High-Volume Squats',
      mechanism: 'Skeletal muscle contractions stimulate GLUT-4 vesicle translocation to cellular membranes independent of insulin pathways, rapidly pulling circulating glucose into muscle glycogen.',
      dosage: 'Daily within 20 mins after lunch & dinner; 3 sets of bodyweight squats.',
    },
    {
      title: 'Endothelial Lipid Oxidation & HDL Upregulation',
      biomarkerRef: lipidMarker ? `${lipidMarker.name}: ${lipidMarker.value} ${lipidMarker.unit} (${lipidMarker.flag})` : 'Lipid Panel Optimization',
      protocol: 'Zone 2 Steady-State Cardio (35–45 minutes, 65–75% Max HR)',
      mechanism: 'Low-intensity aerobic threshold maximizes mitochondrial fatty acid beta-oxidation and stimulates reverse cholesterol transport, clearing excess circulating LDL/ApoB particles.',
      dosage: '4 sessions per week (Incline treadmill walking or upright stationary bike).',
    },
    {
      title: 'Endogenous UVB Vitamin D3 Synthesis & Bone Mineralization',
      biomarkerRef: vitDMarker ? `${vitDMarker.name}: ${vitDMarker.value} ${vitDMarker.unit} (${vitDMarker.flag})` : 'Vitamin D Optimization',
      protocol: 'Outdoor Sunlight Ruck / Weighted Brisk Walk',
      mechanism: 'Combined axial skeletal loading promotes osteoblast mineralization while natural morning UVB solar radiation triggers endogenous 7-dehydrocholesterol photo-isomerization.',
      dosage: '30 minutes outdoor morning sunlight walk (before 10:00 AM) 3x weekly.',
    },
    {
      title: 'Aerobic Fatigue Ceiling & Hypoxia Prevention',
      biomarkerRef: rbcMarker ? `${rbcMarker.name}: ${rbcMarker.value} ${rbcMarker.unit} (${rbcMarker.flag})` : 'RBC Index Maintenance',
      protocol: 'Strict Heart Rate Ceiling & Extended Recovery Intervals',
      mechanism: `Due to microcytic status (${rbcMarker?.value || '12.8'} ${rbcMarker?.unit || 'g/dL'}), cap continuous training at 135 BPM to prevent tissue hypoxia and premature lactic accumulation.`,
      dosage: 'Avoid high-intensity exhaustive anaerobic HIIT until hemoglobin normalizes.',
    },
  ];

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '56vw',
        height: '100svh',
        backgroundColor: '#faf8f5',
        borderLeft: '1px solid #111',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header with Close and ESC controls */}
      <header
        style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid #111',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f2eee9',
          flexShrink: 0,
        }}
      >
        {/* Left Side: Avatar + Agent Name + Close Button Directly Underneath */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
          <div style={{ width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BotAvatar
              type={activeAgent.avatarType}
              state={agentStates[activeAgent.id] || 'default'}
              face="mouth"
              glasses={activeAgent.glasses}
              hat={activeAgent.hat}
              headphones={activeAgent.headphones}
              bowTie={activeAgent.bowTie}
              accessoryColor="#18181b"
              whirl={1}
              size={52}
              shading="plastic"
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 className="heading-xs" style={{ margin: 0, fontWeight: 700, fontSize: '1.25rem' }}>
                {activeAgent.name}
              </h2>
              {allAgents && currentIndex !== undefined && onSelectAgent && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.2rem' }}>
                  <button
                    type="button"
                    onClick={() => onSelectAgent((currentIndex - 1 + allAgents.length) % allAgents.length)}
                    style={{
                      padding: '0.15rem 0.45rem',
                      backgroundColor: '#ffffff',
                      border: '1px solid #111',
                      cursor: 'pointer',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      lineHeight: 1,
                    }}
                    title="Previous Specialist (Left Arrow)"
                    aria-label="Previous Specialist"
                  >
                    ◀
                  </button>
                  <span
                    className="subheading-xs"
                    style={{
                      fontSize: '0.62rem',
                      padding: '0.15rem 0.35rem',
                      backgroundColor: '#111',
                      color: '#fff',
                    }}
                  >
                    {currentIndex + 1}/{allAgents.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectAgent((currentIndex + 1) % allAgents.length)}
                    style={{
                      padding: '0.15rem 0.45rem',
                      backgroundColor: '#ffffff',
                      border: '1px solid #111',
                      cursor: 'pointer',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      lineHeight: 1,
                    }}
                    title="Next Specialist (Right Arrow)"
                    aria-label="Next Specialist"
                  >
                    ▶
                  </button>
                </div>
              )}
              <span
                style={{
                  fontSize: '0.62rem',
                  padding: '0.15rem 0.5rem',
                  border: '1px solid #111',
                  backgroundColor:
                    agentStates[activeAgent.id] === 'working'
                      ? '#fef08a'
                      : agentStates[activeAgent.id] === 'sleeping'
                        ? '#e2e8f0'
                        : '#bbf7d0',
                }}
                className="subheading-xs"
              >
                {agentStates[activeAgent.id]?.toUpperCase() || 'DEFAULT'}
              </span>
            </div>
            <p className="subheading-xs" style={{ color: '#555', marginTop: '0.15rem' }}>
              {activeAgent.role} • {activeAgent.specialty}
            </p>

            {/* Close Button on the left side down the name of the agent */}
            {/* <button
              onClick={onClose}
              className="subheading-xs"
              style={{
                marginTop: '0.45rem',
                padding: '0.35rem 0.85rem',
                backgroundColor: '#111111',
                color: '#ffffff',
                border: '1.5px solid #111111',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 700,
                fontSize: '0.72rem',
                boxShadow: '1px 1px 0px rgba(0,0,0,0.15)',
              }}
              title="Close sidebar (ESC)"
              aria-label="Close sidebar"
            >
              <X size={14} />
              <span>✕ CLOSE (ESC)</span>
            </button> */}
          </div>
        </div>

        {/* Right Side: Cycle Animation & Big Cross Close Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() =>
              setAgentState(
                activeAgent.id,
                agentStates[activeAgent.id] === 'working'
                  ? 'sleeping'
                  : agentStates[activeAgent.id] === 'sleeping'
                    ? 'default'
                    : 'working'
              )
            }
            className="subheading-xs"
            title="Cycle between working, sleeping, and default states"
            style={{
              padding: '0.45rem 0.85rem',
              border: '1px solid #111',
              background: '#ffffff',
              cursor: 'pointer',
              fontSize: '0.7rem',
            }}
          >
            ANIMATION [{agentStates[activeAgent.id] === 'working' ? '⚡ WORK' : agentStates[activeAgent.id] === 'sleeping' ? '💤 SLEEP' : '👁️ AWAKE'}]
          </button>

          <button
            onClick={onClose}
            style={{
              padding: '0.20rem 0.85rem',
              backgroundColor: '#111111',
              color: '#ffffff',
              border: '1px solid #111111',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              gap: '10px'
            }}
            title="Close sidebar [ESC]"
            aria-label="Close sidebar"
          >
            ESC
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Simplified View Switcher: Agent Console vs Live Chat Stream */}
      <nav
        style={{
          display: 'flex',
          borderBottom: '1px solid #111',
          backgroundColor: '#faf8f5',
        }}
      >
        <button
          onClick={() => setDrawerMode('console')}
          className="subheading-xs"
          style={{
            flex: 1,
            padding: '0.85rem 1rem',
            border: 'none',
            borderRight: '1px solid #111',
            backgroundColor: drawerMode === 'console' ? '#ffffff' : 'transparent',
            fontWeight: drawerMode === 'console' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          <LayoutGrid size={14} />
          {activeAgent.id.toUpperCase()} SPECIALIST CONSOLE
        </button>

        <button
          onClick={() => setDrawerMode('chat')}
          className="subheading-xs"
          style={{
            flex: 1,
            padding: '0.85rem 1rem',
            border: 'none',
            backgroundColor: drawerMode === 'chat' ? '#ffffff' : 'transparent',
            fontWeight: drawerMode === 'chat' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          <MessageSquare size={14} />
          LIVE CHAT & TELEMETRY ({(messagesByAgent[activeAgent.id] || []).length})
        </button>
      </nav>

      {/* Main Drawer Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.75rem 2rem' }}>
        {/* VIEW 1: AGENT SPECIALIST CONSOLE (Dynamically changes with selected Agent!) */}
        {drawerMode === 'console' && (
          <div>

            {/* 1. KITTU (Triage / Lab Ingest) */}
            {activeAgent.id === 'triage' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Upload & Sample Demo Banner */}
                <div
                  style={{
                    border: '1.5px dashed #111',
                    padding: '1.75rem',
                    textAlign: 'center',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <Upload size={28} style={{ margin: '0 auto 0.5rem auto', color: '#444' }} />
                  <h3 className="heading-xs" style={{ margin: 0, fontWeight: 600 }}>
                    MEDICAL REPORT INGEST & BIOMARKER OCR
                  </h3>
                  <p className="paragraph-s" style={{ color: '#666', marginTop: '0.35rem' }}>
                    Upload complete blood count (CBC), lipid profile, or metabolic panel PDF.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1rem' }}>
                    <label
                      style={{
                        padding: '0.55rem 1.25rem',
                        backgroundColor: '#111',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                      className="subheading-xs"
                    >
                      {uploadLoading ? 'PARSING LAB OCR...' : 'UPLOAD MEDICAL PDF'}
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                      />
                    </label>

                    <button
                      onClick={loadSampleReport}
                      className="subheading-xs"
                      style={{
                        padding: '0.55rem 1.25rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid #111',
                        color: '#111',
                        cursor: 'pointer',
                      }}
                    >
                      LOAD SAMPLE BLOOD PANEL
                    </button>
                  </div>
                </div>


                {/* Synthesis Card */}
                <div style={{ border: '1px solid #111', padding: '1.25rem', backgroundColor: '#fff' }}>
                  <span className="subheading-xs" style={{ color: '#2563eb' }}>
                    CLINICAL SYNTHESIS // VERIFIED RECORD
                  </span>
                  <p className="paragraph-regular" style={{ marginTop: '0.45rem', fontSize: '0.92rem' }}>
                    {reportSummary}
                  </p>
                </div>

                {/* Biomarkers Matrix */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.65rem',
                    }}
                  >
                    <span className="subheading-xs">EXTRACTED LAB BIOMARKERS ({biomarkers.length})</span>
                    <span className="paragraph-s" style={{ color: '#666' }}>
                      Range analysis active
                    </span>
                  </div>

                  <div style={{ border: '1px solid #111', backgroundColor: '#fff' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #111', backgroundColor: '#f2eee9' }}>
                          <th className="subheading-xs" style={{ padding: '0.75rem 1rem' }}>BIOMARKER</th>
                          <th className="subheading-xs" style={{ padding: '0.75rem 1rem' }}>VALUE</th>
                          <th className="subheading-xs" style={{ padding: '0.75rem 1rem' }}>REFERENCE RANGE</th>
                          <th className="subheading-xs" style={{ padding: '0.75rem 1rem' }}>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {biomarkers.map((b) => (
                          <tr key={b.name} style={{ borderBottom: '0.5px solid #eee' }}>
                            <td className="paragraph-m" style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                              {b.name}
                            </td>
                            <td className="paragraph-m" style={{ padding: '0.75rem 1rem' }}>
                              {b.value} <span style={{ color: '#888', fontSize: '0.72rem' }}>{b.unit}</span>
                            </td>
                            <td className="paragraph-s" style={{ padding: '0.75rem 1rem', color: '#666' }}>
                              {b.reference_range} {b.unit}
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span
                                className="subheading-xs"
                                style={{
                                  padding: '0.2rem 0.55rem',
                                  border: '1px solid #111',
                                  backgroundColor:
                                    b.flag === 'LOW'
                                      ? '#fed7aa'
                                      : b.flag === 'HIGH'
                                        ? '#fecaca'
                                        : '#bbf7d0',
                                  color: '#111',
                                  fontSize: '0.65rem',
                                }}
                              >
                                {b.flag}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 2. HEMANK (Pharma / RX Guide) */}
            {activeAgent.id === 'pharma' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ border: '1px solid #111', padding: '1.25rem', backgroundColor: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a' }}>
                    <Pill size={20} />
                    <h3 className="heading-xs" style={{ margin: 0, fontWeight: 700 }}>
                      PHARMACOLOGY & TARGETED SUPPLEMENT PROTOCOL
                    </h3>
                  </div>
                  <p className="paragraph-s" style={{ color: '#666', marginTop: '0.35rem' }}>
                    Formulated directly from your extracted lab markers to address deficiencies and glucose regulation.
                  </p>
                </div>

                {/* Dynamic Supplement Prescriptions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {dynamicSupplements.map((rx) => (
                    <div
                      key={rx.name}
                      style={{
                        border: '1px solid #111',
                        padding: '1.15rem',
                        backgroundColor: '#ffffff',
                        borderLeft: '4px solid #16a34a',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong className="paragraph-m" style={{ fontSize: '0.9rem' }}>{rx.name}</strong>
                        <span className="subheading-xs" style={{ fontSize: '0.62rem', border: '1px solid #16a34a', padding: '0.15rem 0.45rem', color: '#16a34a' }}>
                          {rx.badge}
                        </span>
                      </div>
                      <p className="paragraph-s" style={{ color: '#15803d', marginTop: '0.35rem', fontWeight: 600 }}>
                        TIMING: {rx.timing}
                      </p>
                      <p className="paragraph-s" style={{ color: '#555', marginTop: '0.2rem' }}>
                        {rx.rationale}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Lab-Correlated Contraindications & Safety Warnings */}
                <div style={{ border: '1px solid #111', padding: '1.15rem', backgroundColor: '#fff', borderLeft: '4px solid #ef4444' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
                    <AlertTriangle size={16} style={{ color: '#ef4444' }} />
                    <span className="subheading-xs" style={{ color: '#b91c1c', fontWeight: 700 }}>
                      LAB-CORRELATED CONTRAINDICATIONS & SAFETY WARNINGS
                    </span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }} className="paragraph-s">
                    {glucoseMarker && glucoseMarker.flag === 'HIGH' && (
                      <li>
                        <strong>Glycemic Elevation ({glucoseMarker.name}: {glucoseMarker.value} {glucoseMarker.unit}):</strong> Avoid high-fructose syrups and high-dose systemic corticosteroids that provoke acute hyperosmolar excursions.
                      </li>
                    )}
                    {lipidMarker && lipidMarker.flag === 'HIGH' && (
                      <li>
                        <strong>Dyslipidemia ({lipidMarker.name}: {lipidMarker.value} {lipidMarker.unit}):</strong> Avoid hydrogenated trans-fats and monitor AST/ALT liver enzymes if combining lipid-lowering agents.
                      </li>
                    )}
                    {vitDMarker && vitDMarker.flag === 'LOW' && (
                      <li>
                        <strong>Hypovitaminosis D ({vitDMarker.name}: {vitDMarker.value} {vitDMarker.unit}):</strong> Avoid taking Vitamin D in isolation without Magnesium cofactor, as hepatic enzymes require magnesium to synthesize calcitriol.
                      </li>
                    )}
                    {rbcMarker && rbcMarker.flag === 'LOW' && (
                      <li>
                        <strong>Microcytic Trend ({rbcMarker.name}: {rbcMarker.value} {rbcMarker.unit}):</strong> Do NOT consume calcium supplements, dairy, tea, or coffee within 2 hours of iron doses (tannins inhibit mucosal absorption).
                      </li>
                    )}
                    <li>
                      <strong>Acute Fever Protocol:</strong> Never co-administer duplicate acetaminophen/paracetamol products (e.g. cold combination syrups) with Dolo/Calpol 650 (max 4g/24h ceiling).
                    </li>
                  </ul>
                </div>

                {/* Acute Symptom & Fever OTC Formulary */}
                <div style={{ border: '1px solid #111', padding: '1.25rem', backgroundColor: '#fff', borderLeft: '4px solid #059669' }}>
                  {/* <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                    <span className="subheading-xs" style={{ color: '#047857', fontWeight: 700 }}>
                      💊 ACUTE SYMPTOM & FEVER OTC FORMULARY
                    </span>
                    <span className="subheading-xs" style={{ fontSize: '0.6rem', border: '1px solid #059669', padding: '0.15rem 0.45rem', backgroundColor: '#ecfdf5', color: '#047857' }}>
                      OTC CERTIFIED (NO RX REQUIRED)
                    </span>
                  </div> */}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {/* <div style={{ border: '1px solid #eee', padding: '0.9rem', backgroundColor: '#faf8f5' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong className="paragraph-m" style={{ fontSize: '0.92rem' }}>
                          Paracetamol IP 650mg / 500mg (Acetaminophen)
                        </strong>
                        <span className="subheading-xs" style={{ color: '#16a34a', fontWeight: 700 }}>
                          ₹30.91 – ₹32.00 / 15 Tabs
                        </span>
                      </div>
                      <p className="paragraph-s" style={{ color: '#444', marginTop: '0.35rem' }}>
                        <strong>Reputable Indian Brands:</strong> Dolo-650 (Micro Labs) • Calpol 650 (GSK) • Crocin 650 Advance (Haleon) • Generic Jan Aushadhi (₹5–₹10 for 10 tabs).
                      </p>
                      <p className="paragraph-s" style={{ color: '#15803d', marginTop: '0.25rem', fontWeight: 600 }}>
                        DOSAGE: 1 tab (500mg or 650mg) after meals every 4–6 hrs as needed (Max 3,000–4,000mg/24h).
                      </p>
                      <p className="paragraph-s" style={{ color: '#666', marginTop: '0.2rem', fontSize: '0.8rem' }}>
                        First-line antipyretic & analgesic for fever, pyrexia, body ache, and headache. Strictly avoid alcohol.
                      </p>
                    </div> */}

                    <div style={{ border: '1px solid #eee', padding: '0.9rem', backgroundColor: '#faf8f5' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong className="paragraph-m" style={{ fontSize: '0.92rem' }}>
                          Electral / WHO-Formula ORS (Hydration Sachet)
                        </strong>
                        <span className="subheading-xs" style={{ color: '#16a34a', fontWeight: 700 }}>
                          ₹22.50 / Sachet (1L)
                        </span>
                      </div>
                      <p className="paragraph-s" style={{ color: '#444', marginTop: '0.35rem' }}>
                        Replenishes sodium, potassium, and glucose lost during fever perspiration. Mix 1 sachet in 1 liter clean drinking water.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Physician Discussion Points */}
                <div style={{ border: '1px solid #111', padding: '1.25rem', backgroundColor: '#fff' }}>
                  <span className="subheading-xs" style={{ color: '#111' }}>
                    QUESTIONS TO ASK YOUR PRIMARY CARE PHYSICIAN
                  </span>
                  <ul style={{ marginTop: '0.65rem', paddingLeft: '1.2rem' }} className="paragraph-s">
                    <li style={{ marginBottom: '0.4rem' }}>
                      "Should we order a follow-up serum Ferritin and Iron Binding Capacity test to evaluate hemoglobin status?"
                    </li>
                    <li style={{ marginBottom: '0.4rem' }}>
                      "Would an HbA1c test be beneficial to confirm whether fasting glucose elevation reflects chronic prediabetes?"
                    </li>
                    <li style={{ marginBottom: '0.4rem' }}>
                      "If fever exceeds 101°F for over 3 days, should a Complete Blood Count (CBC) and Dengue NS1 / Widal test be ordered?"
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* 3. ABHISHEK (Kinesis / Movement Lab) */}
            {activeAgent.id === 'kinesio' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ border: '1px solid #111', padding: '1.25rem', backgroundColor: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#db2777' }}>
                    <Dumbbell size={20} />
                    <h3 className="heading-xs" style={{ margin: 0, fontWeight: 700 }}>
                      KINESIOLOGY & 7-DAY MOVEMENT PRESCRIPTION
                    </h3>
                  </div>
                  <p className="paragraph-s" style={{ color: '#666', marginTop: '0.35rem' }}>
                    Targeted training split structured to stimulate non-insulin mediated glucose clearance.
                  </p>
                </div>

                {/* Lab-Derived Movement Protocols */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="subheading-xs" style={{ color: '#db2777', fontWeight: 700 }}>
                      ⚡ TARGETED LAB-CORRELATED MOVEMENT PROTOCOLS
                    </span>
                    <span className="subheading-xs" style={{ fontSize: '0.6rem', border: '1px solid #db2777', padding: '0.15rem 0.45rem', color: '#db2777' }}>
                      METABOLIC ADAPTATION ACTIVE
                    </span>
                  </div>

                  {dynamicMovementProtocols.map((p) => (
                    <div
                      key={p.title}
                      style={{
                        border: '1px solid #111',
                        padding: '1.15rem',
                        backgroundColor: '#ffffff',
                        borderLeft: '4px solid #db2777',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong className="paragraph-m" style={{ fontSize: '0.9rem' }}>{p.title}</strong>
                          <div style={{ marginTop: '0.2rem' }}>
                            <span className="subheading-xs" style={{ fontSize: '0.62rem', backgroundColor: '#fdf2f8', padding: '0.15rem 0.45rem', border: '1px solid #fbcfe8', color: '#db2777', fontWeight: 600 }}>
                              {p.biomarkerRef}
                            </span>
                          </div>
                        </div>
                        <span className="subheading-xs" style={{ border: '1px solid #111', padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}>
                          {p.protocol.split(' ')[0]}
                        </span>
                      </div>
                      <p className="paragraph-s" style={{ color: '#be185d', marginTop: '0.35rem', fontWeight: 600 }}>
                        PRESCRIPTION: {p.protocol}
                      </p>
                      <p className="paragraph-s" style={{ color: '#555', marginTop: '0.2rem' }}>
                        {p.mechanism}
                      </p>
                      <p className="paragraph-s" style={{ color: '#333', marginTop: '0.25rem', fontSize: '0.8rem', fontWeight: 500 }}>
                        <strong>DOSAGE & TIMING:</strong> {p.dosage}
                      </p>
                    </div>
                  ))}
                </div>

                {/* 7-Day Split */}
                <div style={{ border: '1px solid #111', backgroundColor: '#fff', padding: '1.25rem' }}>
                  <span className="subheading-xs" style={{ display: 'block', marginBottom: '0.85rem' }}>
                    WEEKLY TRAINING SCHEDULE
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      { day: 'MONDAY', type: 'Zone 2 Steady-State Cardio', dur: '35m', focus: '12% incline walking @ 3.2 mph to optimize lipid oxidation' },
                      { day: 'TUESDAY', type: 'Hypertrophy Squats & Hinges', dur: '45m', focus: 'High-volume quad and glute contractions for GLUT-4 uptake' },
                      { day: 'WEDNESDAY', type: 'Active Mobility & Spinal Decompression', dur: '25m', focus: 'Thoracic extension & 90/90 hip switches' },
                      { day: 'THURSDAY', type: 'Zone 2 Upright Cycling', dur: '40m', focus: '125–135 BPM heart rate target' },
                      { day: 'FRIDAY', type: 'Posterior Chain & Core Stability', dur: '45m', focus: 'Kettlebell swings & lat pulldowns' },
                      { day: 'SATURDAY', type: 'Outdoor Sunlight Ruck', dur: '50m', focus: 'Weighted brisk walk with natural UVB sunlight exposure' },
                      { day: 'SUNDAY', type: 'Parasympathetic Reset', dur: '20m', focus: 'Diaphragmatic box breathing & cold recovery' },
                    ].map((s) => (
                      <div
                        key={s.day}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '0.5px solid #eee',
                          paddingBottom: '0.5rem',
                        }}
                      >
                        <div style={{ maxWidth: '70%' }}>
                          <span className="subheading-xs" style={{ fontWeight: 700, color: '#db2777' }}>
                            [{s.day}]
                          </span>
                          <strong className="paragraph-m" style={{ marginLeft: '0.5rem' }}>{s.type}</strong>
                          <p className="paragraph-s" style={{ color: '#666', marginTop: '0.15rem' }}>{s.focus}</p>
                        </div>
                        <span className="subheading-xs" style={{ border: '1px solid #111', padding: '0.2rem 0.5rem' }}>
                          {s.dur}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. GHOST (Concierge / Doctor Scout & Calendar) */}
            {activeAgent.id === 'concierge' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ border: '1px solid #111', padding: '1.25rem', backgroundColor: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0284c7' }}>
                    <Stethoscope size={20} />
                    <h3 className="heading-xs" style={{ margin: 0, fontWeight: 700 }}>
                      AUTONOMOUS DOCTOR SCOUT & GCAL ACTUATOR
                    </h3>
                  </div>
                  <p className="paragraph-s" style={{ color: '#666', marginTop: '0.35rem' }}>
                    Scouts specialists, dispatches appointment request emails via Gmail, and locks slots in Google Calendar.
                  </p>
                </div>

                {/* Confirmed Bookings Banner */}
                {bookedAppointments.length > 0 && (
                  <div style={{ border: '1.5px solid #059669', backgroundColor: '#ecfdf5', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#047857' }}>
                      <CheckCircle2 size={18} />
                      <span className="subheading-xs" style={{ fontWeight: 700 }}>
                        APPOINTMENT CONFIRMED ({bookedAppointments.length} ACTIVE)
                      </span>
                    </div>

                    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {bookedAppointments.map((b, i) => (
                        <div
                          key={i}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #059669',
                            padding: '0.85rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <strong className="paragraph-m">{b.doctor || 'Dr. Sarah Lin, MD'}</strong>
                            <p className="paragraph-s" style={{ color: '#555', marginTop: '0.2rem' }}>
                              Tomorrow at 10:30 AM • {b.address || '450 Lexington Ave, New York'}
                            </p>
                          </div>
                          {b.calendar?.html_link && (
                            <a
                              href={b.calendar.html_link}
                              target="_blank"
                              rel="noreferrer"
                              className="subheading-xs"
                              style={{
                                backgroundColor: '#059669',
                                color: '#fff',
                                padding: '0.45rem 0.85rem',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                              }}
                            >
                              OPEN GCAL <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 1. Clinical Conditions & Diseases Diagnosed From Medical Report */}
                <div style={{ border: '1px solid #111', padding: '1.25rem', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="subheading-xs" style={{ color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
                      <AlertTriangle size={15} /> CLINICAL CONDITIONS DETECTED IN YOUR REPORT
                    </span>
                    <span className="paragraph-xs" style={{ color: '#64748b' }}>
                      {diagnosedConditions.length} Diagnoses Identified
                    </span>
                  </div>

                  <p className="paragraph-xs" style={{ color: '#555', margin: 0 }}>
                    Our clinical engine extracted these metabolic conditions directly from your blood panel telemetry. Doctors below are automatically matched to treat these specific diagnoses.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.65rem' }}>
                    {diagnosedConditions.map((cond, i) => (
                      <div
                        key={i}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderLeft: '4px solid #f59e0b',
                          padding: '0.75rem 0.95rem',
                          backgroundColor: '#fffbeb',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <strong className="paragraph-m" style={{ color: '#92400e', fontWeight: 700, fontSize: '0.88rem' }}>
                              {cond.condition}
                            </strong>
                            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                              {cond.biomarkers_implicated.map((bm, bi) => (
                                <span
                                  key={bi}
                                  className="subheading-xs"
                                  style={{
                                    fontSize: '0.62rem',
                                    backgroundColor: '#fef3c7',
                                    padding: '0.1rem 0.4rem',
                                    border: '1px solid #fde68a',
                                    color: '#b45309',
                                    fontWeight: 600,
                                  }}
                                >
                                  {bm}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span
                            className="subheading-xs"
                            style={{
                              fontSize: '0.62rem',
                              backgroundColor: '#b45309',
                              color: '#fff',
                              padding: '0.15rem 0.45rem',
                              fontWeight: 700,
                            }}
                          >
                            {cond.severity}
                          </span>
                        </div>
                        <p className="paragraph-xs" style={{ color: '#78350f', marginTop: '0.35rem', lineHeight: '1.3' }}>
                          {cond.guidance}
                        </p>
                        <p className="paragraph-xs" style={{ color: '#0369a1', marginTop: '0.25rem', fontWeight: 700 }}>
                          ➔ Matched Specialist Required: {cond.needed_specialist}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Patient Location Radar (No manual specialty asking) */}
                <div style={{ border: '1px solid #111', padding: '1.15rem', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="subheading-xs" style={{ color: '#0284c7', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
                      <MapPin size={14} /> PATIENT REGION / LOCATION RADAR
                    </span>
                    <span className="paragraph-xs" style={{ color: '#059669', fontWeight: 600 }}>
                      ✓ Active Radar: {userLocation}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <MapPin size={16} style={{ position: 'absolute', left: '0.75rem', color: '#64748b' }} />
                      <input
                        type="text"
                        value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value)}
                        placeholder="Enter your city/region (e.g. Gorakhpur, Uttar Pradesh)..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSearchDoctors();
                        }}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                          border: '1px solid #111',
                          fontSize: '0.85rem',
                          fontFamily: 'inherit',
                          backgroundColor: '#ffffff',
                        }}
                      />
                    </div>
                    <button
                      onClick={() => handleSearchDoctors()}
                      style={{
                        backgroundColor: '#0284c7',
                        color: '#fff',
                        border: 'none',
                        padding: '0 1.25rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.75rem',
                      }}
                    >
                      <Search size={14} /> UPDATE RADAR
                    </button>
                  </div>

                  {/* Quick Locations */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span className="paragraph-xs" style={{ color: '#64748b', marginRight: '0.2rem' }}>Quick Regions:</span>
                    {[
                      'Gorakhpur, Uttar Pradesh',
                      'Lucknow, UP',
                      'New Delhi',
                      'Varanasi, UP',
                    ].map((loc) => (
                      <button
                        key={loc}
                        onClick={() => {
                          setLocationInput(loc);
                          handleSearchDoctors(selectedSpecialty, loc);
                        }}
                        style={{
                          fontSize: '0.68rem',
                          padding: '0.2rem 0.55rem',
                          border: userLocation === loc ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                          backgroundColor: userLocation === loc ? '#e0f2fe' : '#ffffff',
                          color: userLocation === loc ? '#0369a1' : '#334155',
                          cursor: 'pointer',
                          fontWeight: userLocation === loc ? 700 : 500,
                        }}
                      >
                        📍 {loc}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Matched Specialists in User's Location Bound to Their Specific Report Conditions */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
                    <span className="subheading-xs" style={{ display: 'block', fontWeight: 700 }}>
                      RECOMMENDED SPECIALISTS IN {userLocation.toUpperCase()} (MATCHED TO YOUR REPORT)
                    </span>
                    <span className="paragraph-xs" style={{ color: '#059669', fontWeight: 600 }}>
                      {doctors.length} Verified Specialists
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {doctors.map((doc) => (
                      <div
                        key={doc.doctor_name}
                        style={{
                          border: '1px solid #111',
                          padding: '1.25rem',
                          backgroundColor: '#ffffff',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          boxShadow: '2px 2px 0 #111',
                          borderLeft: '4px solid #0284c7',
                        }}
                      >
                        <div style={{ maxWidth: '68%' }}>
                          {doc.matched_condition && (
                            <div style={{ marginBottom: '0.4rem' }}>
                              <span
                                className="subheading-xs"
                                style={{
                                  fontSize: '0.64rem',
                                  backgroundColor: '#fee2e2',
                                  color: '#991b1b',
                                  border: '1px solid #fecaca',
                                  padding: '0.15rem 0.5rem',
                                  fontWeight: 700,
                                }}
                              >
                                ⚠️ TARGETING: {doc.matched_condition}
                              </span>
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <strong className="paragraph-m" style={{ fontWeight: 700 }}>
                              {doc.doctor_name}
                            </strong>
                            <span
                              className="subheading-xs"
                              style={{
                                fontSize: '0.62rem',
                                backgroundColor: '#e0e7ff',
                                padding: '0.1rem 0.4rem',
                              }}
                            >
                              ★ {doc.rating}
                            </span>
                          </div>

                          <p className="paragraph-s" style={{ color: '#334155', marginTop: '0.2rem', fontWeight: 600 }}>
                            {doc.clinic_name} • <span style={{ color: '#0284c7' }}>{doc.specialty}</span>
                          </p>

                          {doc.matched_reason && (
                            <p className="paragraph-xs" style={{ color: '#475569', marginTop: '0.25rem', fontStyle: 'italic', lineHeight: '1.3' }}>
                              {doc.matched_reason}
                            </p>
                          )}

                          <p className="paragraph-s" style={{ color: '#64748b', marginTop: '0.2rem' }}>
                            📍 {doc.address} ({doc.distance})
                          </p>
                        </div>

                        <button
                          onClick={() => bookDoctorAppointment(doc)}
                          className="subheading-xs"
                          style={{
                            padding: '0.75rem 1.15rem',
                            backgroundColor: '#111',
                            color: '#fff',
                            cursor: 'pointer',
                            border: 'none',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          DISPATCH GMAIL & GCAL →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: LIVE CHAT & TELEMETRY STREAM (Completely distinct per agent!) */}
        {drawerMode === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
            {/* Unique Agent Live Telemetry Diagnostic Bar */}
            <div
              style={{
                border: '1px solid #111',
                padding: '0.85rem 1.15rem',
                backgroundColor: '#ffffff',
                boxShadow: '2px 2px 0 #111',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="subheading-xs" style={{ color: activeAgent.color, fontWeight: 700 }}>
                  ● LIVE TELEMETRY STREAM // {activeAgent.name}
                </span>
                <span
                  className="subheading-xs"
                  style={{
                    fontSize: '0.58rem',
                    backgroundColor: agentStates[activeAgent.id] === 'working' ? '#fef08a' : '#e5e7eb',
                    padding: '0.1rem 0.4rem',
                    border: '1px solid #111',
                  }}
                >
                  STATUS: {agentStates[activeAgent.id]?.toUpperCase() || 'DEFAULT'}
                </span>
              </div>

              {/* Agent-Specific Diagnostic Metrics Grid */}
              {activeAgent.id === 'triage' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  <div style={{ borderRight: '1px solid #eee', paddingRight: '0.4rem' }}>
                    <span className="subheading-xs" style={{ fontSize: '0.58rem', color: '#666' }}>DOCUMENT SCAN</span>
                    <strong className="paragraph-s" style={{ display: 'block', marginTop: '0.1rem' }}>Active Analysis</strong>
                  </div>
                  <div style={{ borderRight: '1px solid #eee', paddingRight: '0.4rem' }}>
                    <span className="subheading-xs" style={{ fontSize: '0.58rem', color: '#666' }}>TRACKED MARKERS</span>
                    <strong className="paragraph-s" style={{ display: 'block', marginTop: '0.1rem' }}>{biomarkers.length} Biomarkers</strong>
                  </div>
                  <div style={{ borderRight: '1px solid #eee', paddingRight: '0.4rem' }}>
                    <span className="subheading-xs" style={{ fontSize: '0.58rem', color: '#666' }}>ANOMALY FLAGS</span>
                    <strong className="paragraph-s" style={{ display: 'block', marginTop: '0.1rem', color: '#dc2626' }}>2 Low, 2 High</strong>
                  </div>
                  <div>
                    <span className="subheading-xs" style={{ fontSize: '0.58rem', color: '#666' }}>RECORD STATUS</span>
                    <strong className="paragraph-s" style={{ display: 'block', marginTop: '0.1rem', color: '#16a34a' }}>Synchronized</strong>
                  </div>
                </div>
              )}

              {activeAgent.id === 'pharma' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  <div style={{ borderRight: '1px solid #eee', paddingRight: '0.4rem' }}>
                    <span className="subheading-xs" style={{ fontSize: '0.58rem', color: '#666' }}>FORMULARY</span>
                    <strong className="paragraph-s" style={{ display: 'block', marginTop: '0.1rem' }}>Clinical Guidelines</strong>
                  </div>
                  <div style={{ borderRight: '1px solid #eee', paddingRight: '0.4rem' }}>
                    <span className="subheading-xs" style={{ fontSize: '0.58rem', color: '#666' }}>PRESCRIBED</span>
                    <strong className="paragraph-s" style={{ display: 'block', marginTop: '0.1rem' }}>3 Supplements</strong>
                  </div>
                  <div style={{ borderRight: '1px solid #eee', paddingRight: '0.4rem' }}>
                    <span className="subheading-xs" style={{ fontSize: '0.58rem', color: '#666' }}>INTERACTIONS</span>
                    <strong className="paragraph-s" style={{ display: 'block', marginTop: '0.1rem', color: '#16a34a' }}>0 Conflicts</strong>
                  </div>
                  <div>
                    <span className="subheading-xs" style={{ fontSize: '0.58rem', color: '#666' }}>COFACTOR LINK</span>
                    <strong className="paragraph-s" style={{ display: 'block', marginTop: '0.1rem' }}>Mg²⁺ / K2 Bound</strong>
                  </div>
                </div>
              )}

              {activeAgent.id === 'kinesio' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  <div style={{ borderRight: '1px solid #eee', paddingRight: '0.4rem' }}>
                    <span className="subheading-xs" style={{ fontSize: '0.58rem', color: '#666' }}>TARGET HR</span>
                    <strong className="paragraph-s" style={{ display: 'block', marginTop: '0.1rem', color: '#db2777' }}>Zone 2 (120-135)</strong>
                  </div>
                  <div style={{ borderRight: '1px solid #eee', paddingRight: '0.4rem' }}>
                    <span className="subheading-xs" style={{ fontSize: '0.58rem', color: '#666' }}>WEEKLY SPLIT</span>
                    <strong className="paragraph-s" style={{ display: 'block', marginTop: '0.1rem' }}>4 Train / 2 Mobility</strong>
                  </div>
                  <div style={{ borderRight: '1px solid #eee', paddingRight: '0.4rem' }}>
                    <span className="subheading-xs" style={{ fontSize: '0.58rem', color: '#666' }}>PATHWAY</span>
                    <strong className="paragraph-s" style={{ display: 'block', marginTop: '0.1rem' }}>GLUT-4 Glucose</strong>
                  </div>
                  <div>
                    <span className="subheading-xs" style={{ fontSize: '0.58rem', color: '#666' }}>FATIGUE INDEX</span>
                    <strong className="paragraph-s" style={{ display: 'block', marginTop: '0.1rem', color: '#16a34a' }}>Low / Adapted</strong>
                  </div>
                </div>
              )}

              {activeAgent.id === 'concierge' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  <div style={{ borderRight: '1px solid #eee', paddingRight: '0.4rem' }}>
                    <span className="subheading-xs" style={{ fontSize: '0.58rem', color: '#666' }}>SPECIALISTS</span>
                    <strong className="paragraph-s" style={{ display: 'block', marginTop: '0.1rem', color: '#0284c7' }}>{doctors.length} Verified</strong>
                  </div>
                  <div style={{ borderRight: '1px solid #eee', paddingRight: '0.4rem' }}>
                    <span className="subheading-xs" style={{ fontSize: '0.58rem', color: '#666' }}>CLINIC CONTACT</span>
                    <strong className="paragraph-s" style={{ display: 'block', marginTop: '0.1rem' }}>Connected</strong>
                  </div>
                  <div style={{ borderRight: '1px solid #eee', paddingRight: '0.4rem' }}>
                    <span className="subheading-xs" style={{ fontSize: '0.58rem', color: '#666' }}>SCHEDULE</span>
                    <strong className="paragraph-s" style={{ display: 'block', marginTop: '0.1rem' }}>Calendar Ready</strong>
                  </div>
                  <div>
                    <span className="subheading-xs" style={{ fontSize: '0.58rem', color: '#666' }}>CONFIRMED</span>
                    <strong className="paragraph-s" style={{ display: 'block', marginTop: '0.1rem', color: '#16a34a' }}>{bookedAppointments.length} Active</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Dedicated Message Feed for Active Agent */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                flex: 1,
                overflowY: 'auto',
                paddingRight: '0.5rem',
              }}
            >
              {(messagesByAgent[activeAgent.id] || []).map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '1rem 1.25rem',
                      backgroundColor: msg.sender === 'user' ? '#111' : '#ffffff',
                      color: msg.sender === 'user' ? '#fff' : '#111',
                      border: '1px solid #111',
                      boxShadow: msg.sender === 'user' ? '3px 3px 0 #888' : '3px 3px 0 #111',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.4rem',
                      }}
                    >
                      <span
                        className="subheading-xs"
                        style={{
                          color: msg.sender === 'user' ? '#a3a3a3' : '#666',
                          fontSize: '0.62rem',
                        }}
                      >
                        {msg.sender === 'user'
                          ? `PATIENT (${currentUser ? currentUser.fullName.toUpperCase() : 'USER'})`
                          : activeAgent.name}
                      </span>
                      <span
                        className="paragraph-s"
                        style={{
                          fontSize: '0.62rem',
                          color: msg.sender === 'user' ? '#888' : '#aaa',
                        }}
                      >
                        {msg.timestamp}
                      </span>
                    </div>

                    {msg.sender === 'user' ? (
                      <p
                        className="paragraph-regular"
                        style={{
                          whiteSpace: 'pre-wrap',
                          fontSize: '0.9rem',
                          lineHeight: 1.55,
                          margin: 0,
                        }}
                      >
                        {msg.text}
                      </p>
                    ) : (
                      <div
                        className="agent-chat-markdown"
                        style={{
                          fontSize: '0.9rem',
                          lineHeight: 1.6,
                          color: '#111',
                          overflowWrap: 'break-word',
                        }}
                      >
                        <ReactMarkdown
                          components={{
                            h1: ({ node, ...props }) => (
                              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0.65rem 0 0.35rem 0', color: '#111', borderBottom: '1px solid #e5e5e5', paddingBottom: '0.2rem' }} {...props} />
                            ),
                            h2: ({ node, ...props }) => (
                              <h4 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0.6rem 0 0.3rem 0', color: '#111' }} {...props} />
                            ),
                            h3: ({ node, ...props }) => (
                              <h5 style={{ fontSize: '0.92rem', fontWeight: 700, margin: '0.5rem 0 0.25rem 0', color: '#16a34a' }} {...props} />
                            ),
                            h4: ({ node, ...props }) => (
                              <h6 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0.4rem 0 0.2rem 0', color: '#333' }} {...props} />
                            ),
                            p: ({ node, ...props }) => (
                              <p style={{ margin: '0.35rem 0', lineHeight: 1.55 }} {...props} />
                            ),
                            ul: ({ node, ...props }) => (
                              <ul style={{ margin: '0.35rem 0 0.5rem 1.25rem', padding: 0, listStyleType: 'disc' }} {...props} />
                            ),
                            ol: ({ node, ...props }) => (
                              <ol style={{ margin: '0.35rem 0 0.5rem 1.25rem', padding: 0, listStyleType: 'decimal' }} {...props} />
                            ),
                            li: ({ node, ...props }) => (
                              <li style={{ margin: '0.25rem 0' }} {...props} />
                            ),
                            strong: ({ node, ...props }) => (
                              <strong style={{ fontWeight: 700, color: '#111' }} {...props} />
                            ),
                            blockquote: ({ node, ...props }) => (
                              <blockquote style={{ borderLeft: '3px solid #16a34a', paddingLeft: '0.75rem', margin: '0.5rem 0', color: '#555', fontStyle: 'italic' }} {...props} />
                            ),
                            code: ({ node, ...props }) => (
                              <code style={{ backgroundColor: '#f1f1f1', padding: '0.1rem 0.35rem', borderRadius: '3px', fontSize: '0.82rem', fontFamily: 'monospace' }} {...props} />
                            ),
                          }}
                        >
                          {msg.text || (isStreaming ? 'Synthesizing response...' : '')}
                        </ReactMarkdown>
                      </div>
                    )}

                    {msg.toolResult?.type === 'booking_confirmed' && (
                      <div
                        style={{
                          marginTop: '0.75rem',
                          backgroundColor: '#ecfdf5',
                          border: '1px solid #059669',
                          padding: '0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#047857' }}>
                          <CheckCircle2 size={16} />
                          <strong className="subheading-xs">APPOINTMENT SECURED & CALENDAR LOCKED</strong>
                        </div>
                        {msg.toolResult.calendar?.html_link && (
                          <a
                            href={msg.toolResult.calendar.html_link}
                            target="_blank"
                            rel="noreferrer"
                            className="subheading-xs"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              marginTop: '0.45rem',
                              color: '#047857',
                              textDecoration: 'underline',
                            }}
                          >
                            VIEW IN GOOGLE CALENDAR <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Completely Distinct Quick Action Prompts for Each Agent */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {activeAgent.id === 'triage' && (
                <>
                  <button
                    onClick={() => sendMessage('Explain why my Vitamin D is low at 18.4 ng/mL and how to address it')}
                    className="paragraph-s"
                    style={{ backgroundColor: '#ffffff', border: '1px solid #ccc', padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.72rem' }}
                  >
                    + Explain low Vitamin D (18.4 ng/mL)
                  </button>
                  <button
                    onClick={() => sendMessage('Why is fasting glucose of 104 mg/dL flagged as high?')}
                    className="paragraph-s"
                    style={{ backgroundColor: '#ffffff', border: '1px solid #ccc', padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.72rem' }}
                  >
                    + Explain fasting glucose (104 mg/dL)
                  </button>
                  <button
                    onClick={() => sendMessage('What follow-up blood tests are recommended for mild microcytic hemoglobin?')}
                    className="paragraph-s"
                    style={{ backgroundColor: '#ffffff', border: '1px solid #ccc', padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.72rem' }}
                  >
                    + Follow-up tests for Hemoglobin
                  </button>
                  <button
                    onClick={() => sendMessage('What should I take for fever? Please recommend medicine name and price.')}
                    className="paragraph-s"
                    style={{ backgroundColor: '#ffffff', border: '1px solid #059669', color: '#047857', padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}
                  >
                    + What to take for fever? (Medicine & Price)
                  </button>
                </>
              )}

              {activeAgent.id === 'pharma' && (
                <>
                  <button
                    onClick={() => sendMessage('What medicine should I take for fever? Please specify medicine names like Paracetamol and exact price.')}
                    className="paragraph-s"
                    style={{ backgroundColor: '#ffffff', border: '1.5px solid #16a34a', color: '#15803d', padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}
                  >
                    + Fever Medicine & Paracetamol Price
                  </button>
                  <button
                    onClick={() => sendMessage('What is the recommended dosage, timing, and safety limit for Paracetamol / Dolo 650?')}
                    className="paragraph-s"
                    style={{ backgroundColor: '#ffffff', border: '1px solid #ccc', padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.72rem' }}
                  >
                    + Paracetamol dosage & timing
                  </button>
                  <button
                    onClick={() => sendMessage('Why must Vitamin D3 be paired with K2 and taken with dietary fat?')}
                    className="paragraph-s"
                    style={{ backgroundColor: '#ffffff', border: '1px solid #ccc', padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.72rem' }}
                  >
                    + Why pair Vitamin D3 with K2?
                  </button>
                  <button
                    onClick={() => sendMessage('What is the best timing for Magnesium Glycinate and how does it assist sleep?')}
                    className="paragraph-s"
                    style={{ backgroundColor: '#ffffff', border: '1px solid #ccc', padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.72rem' }}
                  >
                    + Magnesium Glycinate sleep timing
                  </button>
                  <button
                    onClick={() => sendMessage('Can Berberine or Alpha Lipoic Acid safely lower post-meal glucose spikes?')}
                    className="paragraph-s"
                    style={{ backgroundColor: '#ffffff', border: '1px solid #ccc', padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.72rem' }}
                  >
                    + Berberine for post-meal spikes
                  </button>
                </>
              )}

              {activeAgent.id === 'kinesio' && (
                <>
                  <button
                    onClick={() => sendMessage('How does Zone 2 cardio clear elevated fasting glucose without raising cortisol?')}
                    className="paragraph-s"
                    style={{ backgroundColor: '#ffffff', border: '1px solid #ccc', padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.72rem' }}
                  >
                    + How Zone 2 cardio clears glucose
                  </button>
                  <button
                    onClick={() => sendMessage('What heart rate BPM range should I maintain on the treadmill for Zone 2?')}
                    className="paragraph-s"
                    style={{ backgroundColor: '#ffffff', border: '1px solid #ccc', padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.72rem' }}
                  >
                    + Target Zone 2 BPM range
                  </button>
                  <button
                    onClick={() => sendMessage('Suggest a 10-minute mobility routine to relieve lumbar spine tightness')}
                    className="paragraph-s"
                    style={{ backgroundColor: '#ffffff', border: '1px solid #ccc', padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.72rem' }}
                  >
                    + 10-min spinal mobility routine
                  </button>
                </>
              )}

              {activeAgent.id === 'concierge' && (
                <>
                  <button
                    onClick={() => sendMessage('Scout top-rated endocrinologists and hematologists near me in New York')}
                    className="paragraph-s"
                    style={{ backgroundColor: '#ffffff', border: '1px solid #ccc', padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.72rem' }}
                  >
                    + Scout top specialists near me
                  </button>
                  <button
                    onClick={() => sendMessage('Dispatch appointment consultation email to Dr. Sarah Lin for tomorrow 10:30 AM')}
                    className="paragraph-s"
                    style={{ backgroundColor: '#ffffff', border: '1px solid #ccc', padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.72rem' }}
                  >
                    + Dispatch Gmail to Dr. Sarah Lin
                  </button>
                  <button
                    onClick={() => sendMessage('Confirm appointment and generate direct Google Calendar link')}
                    className="paragraph-s"
                    style={{ backgroundColor: '#ffffff', border: '1px solid #ccc', padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.72rem' }}
                  >
                    + Generate Google Calendar link
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Drawer Input Bar with Custom Placeholder per Agent */}
      <form
        onSubmit={handleSend}
        style={{
          borderTop: '1px solid #111',
          padding: '1.15rem 2rem',
          backgroundColor: '#f2eee9',
          display: 'flex',
          gap: '0.75rem',
        }}
      >
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={
            activeAgent.id === 'triage'
              ? 'Ask KITTU about your lab results, blood work, symptoms (e.g. fever), or what to take...'
              : activeAgent.id === 'pharma'
                ? 'Ask CHINTU about medicine names, fever remedies, dosages, pricing (e.g., Paracetamol/Dolo 650), or drug interactions...'
                : activeAgent.id === 'kinesio'
                  ? 'Ask GOLU about workout splits, heart rate zones, or mobility...'
                  : 'Ask BUNTY to scout nearby specialists or lock an appointment via Gmail & GCal...'
          }
          style={{
            flex: 1,
            border: '1px solid #111',
            padding: '0.75rem 1rem',
            backgroundColor: '#ffffff',
            outline: 'none',
          }}
          className="paragraph-regular"
        />
        <button
          type="submit"
          disabled={isStreaming}
          className="subheading-xs"
          style={{
            backgroundColor: '#111',
            color: '#fff',
            border: '1px solid #111',
            padding: '0 1.5rem',
            cursor: isStreaming ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}
        >
          {isStreaming ? 'STREAMING...' : 'DISPATCH'}
          <Send size={13} />
        </button>
      </form>
    </aside>
  );
};

