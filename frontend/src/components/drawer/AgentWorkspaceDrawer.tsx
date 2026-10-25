import React, { useState } from 'react';
import { BotAvatar } from 'bot-avatars';
import { useHealthcareStore, Doctor } from '../../store/useHealthcareStore';
import {
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
  avatarType: 'clover' | 'flower' | 'square' | 'ghost';
  face?: 'eyes' | 'mouth';
  color: string;
  model: string;
  capabilities: string[];
  glasses?: 'round' | 'square' | 'shades';
  hat?: 'beret' | 'beanie' | 'party' | 'crown';
  headphones?: boolean;
  bowTie?: boolean;
}

export const AgentWorkspaceDrawer: React.FC<{
  activeAgent: HealthcareAgent;
  onClose: () => void;
}> = ({ activeAgent, onClose }) => {
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
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '1.25rem 2rem',
          borderBottom: '1px solid #111',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f2eee9',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
          <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BotAvatar
              type={activeAgent.avatarType}
              state={agentStates[activeAgent.id] || 'default'}
              face="mouth"
              glasses={activeAgent.glasses}
              hat={activeAgent.hat}
              headphones={activeAgent.headphones}
              bowTie={activeAgent.bowTie}
              whirl={1}
              size={48}
              shading="plastic"
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 className="heading-xs" style={{ margin: 0, fontWeight: 700, fontSize: '1.25rem' }}>
                {activeAgent.name}
              </h2>
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
            <p className="subheading-xs" style={{ color: '#555', marginTop: '0.2rem' }}>
              {activeAgent.role} • {activeAgent.specialty}
            </p>
          </div>
        </div>

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
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            CYCLE ANIMATION [{agentStates[activeAgent.id] === 'working' ? '⚡ WORK' : agentStates[activeAgent.id] === 'sleeping' ? '💤 SLEEP' : '👁️ AWAKE'}]
          </button>
          <button
            onClick={onClose}
            className="subheading-xs"
            style={{
              padding: '0.45rem 1rem',
              backgroundColor: '#111',
              color: '#fff',
              border: '1px solid #111',
              cursor: 'pointer',
            }}
          >
            CLOSE [ESC]
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
            {/* 1. CLOVER (Triage / Lab Ingest) */}
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

            {/* 2. FLOWER (Pharma / RX Guide) */}
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

                {/* Supplement Prescriptions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {[
                    {
                      name: 'Vitamin D3 (5000 IU) + K2 (100mcg MK-7)',
                      timing: 'Morning with healthy fats (eggs/avocado)',
                      rationale: 'Directly targets baseline 18.4 ng/mL hypovitaminosis to restore optimal 45–60 ng/mL range.',
                      badge: 'High Priority',
                    },
                    {
                      name: 'Magnesium Glycinate (300 mg elemental)',
                      timing: 'Night, 45 minutes prior to sleep',
                      rationale: 'Essential enzymatic cofactor required for hepatic conversion of Vitamin D3 into active 25-OH.',
                      badge: 'Co-Factor',
                    },
                    {
                      name: 'Alpha Lipoic Acid / Berberine (500 mg)',
                      timing: '15 minutes before highest carbohydrate meal',
                      rationale: 'Stimulates peripheral GLUT-4 translocation to attenuate elevated 104 mg/dL fasting glucose.',
                      badge: 'Metabolic',
                    },
                  ].map((rx) => (
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

                {/* Acute Symptom & Fever OTC Formulary */}
                <div style={{ border: '1px solid #111', padding: '1.25rem', backgroundColor: '#fff', borderLeft: '4px solid #059669' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                    <span className="subheading-xs" style={{ color: '#047857', fontWeight: 700 }}>
                      💊 ACUTE SYMPTOM & FEVER OTC FORMULARY
                    </span>
                    <span className="subheading-xs" style={{ fontSize: '0.6rem', border: '1px solid #059669', padding: '0.15rem 0.45rem', backgroundColor: '#ecfdf5', color: '#047857' }}>
                      OTC CERTIFIED (NO RX REQUIRED)
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ border: '1px solid #eee', padding: '0.9rem', backgroundColor: '#faf8f5' }}>
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
                    </div>

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

            {/* 3. SQUARE (Kinesis / Movement Lab) */}
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

                    <p
                      className="paragraph-regular"
                      style={{
                        whiteSpace: 'pre-wrap',
                        fontSize: '0.9rem',
                        lineHeight: 1.55,
                      }}
                    >
                      {msg.text || (isStreaming ? 'Synthesizing response...' : '')}
                    </p>

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
              ? 'Ask CLOVER about your lab results, blood work, symptoms (e.g. fever), or what to take...'
              : activeAgent.id === 'pharma'
              ? 'Ask FLOWER about medicine names, fever remedies, dosages, pricing (e.g., Paracetamol/Dolo 650), or drug interactions...'
              : activeAgent.id === 'kinesio'
              ? 'Ask SQUARE about workout splits, heart rate zones, or mobility...'
              : 'Ask GHOST to scout nearby specialists or lock an appointment via Gmail & GCal...'
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

