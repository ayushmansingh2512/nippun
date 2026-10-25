import React, { useEffect } from 'react';
import { BotAvatar } from 'bot-avatars';
import { useHealthcareStore } from '../../store/useHealthcareStore';
import { AgentWorkspaceDrawer } from '../drawer/AgentWorkspaceDrawer';
import { AuthModal } from '../layout/AuthModal';

export interface HealthcareAgent {
  id: string;
  name: string;
  role: string;
  specialty: string;
  avatarType: 'clover' | 'flower' | 'square' | 'ghost';
  color: string;
  model: string;
  capabilities: string[];
  glasses?: 'round' | 'square' | 'shades';
  hat?: 'beret' | 'beanie' | 'party' | 'crown';
  headphones?: boolean;
  bowTie?: boolean;
}

export const AGENTS: HealthcareAgent[] = [
  {
    id: 'triage',
    name: 'CLOVER · INGEST',
    role: 'Medical Report Parser',
    specialty: 'Biomarker & Lab OCR',
    avatarType: 'clover',
    color: '#2563eb',
    model: 'Gemini 2.5 Flash',
    capabilities: ['PDF Lab Extraction', 'Biomarker Flagging', 'Medical Record Sync'],
    glasses: 'round',
  },
  {
    id: 'pharma',
    name: 'FLOWER · RX GUIDE',
    role: 'Pharmacology Advisor',
    specialty: 'Medication & Supplement Safety',
    avatarType: 'flower',
    color: '#16a34a',
    model: 'Gemini 2.5 Pro',
    capabilities: ['Dosage Timing', 'Contraindication Check', 'Physician Discussion Points'],
    hat: 'beret',
  },
  {
    id: 'kinesio',
    name: 'SQUARE · KINESIS',
    role: 'Exercise & Rehab Coach',
    specialty: 'Physiotherapy & Mobility',
    avatarType: 'square',
    color: '#db2777',
    model: 'Gemini 2.5 Flash',
    capabilities: ['Zone 2 Conditioning', 'Hypertrophy for Glucose Clearance', 'Joint Recovery'],
    headphones: true,
  },
  {
    id: 'concierge',
    name: 'GHOST · DISPATCH',
    role: 'Doctor Scout & Scheduler',
    specialty: 'Specialist Discovery & Booking',
    avatarType: 'ghost',
    color: '#0284c7',
    model: 'Clinical Discovery & Dispatch',
    capabilities: ['Specialist Discovery', 'Automated Clinic Consultation', 'Calendar Reservation'],
    bowTie: true,
  },
];

export const A24HealthcareStage: React.FC = () => {
  const {
    currentUser,
    authModalOpen,
    setAuthModalOpen,
    logout,
    focusedIndex,
    setFocusedIndex,
    drawerOpen,
    setDrawerOpen,
    setDrawerMode,
    agentStates,
    isStreaming,
  } = useHealthcareStore();

  const activeAgent = AGENTS[focusedIndex] || AGENTS[0];

  const handleAvatarClick = (index: number) => {
    setFocusedIndex(index);
    setDrawerMode('console');
    setDrawerOpen(true);
  };

  // Keyboard navigation [Esc to close, Arrow keys to switch]
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (authModalOpen) {
          setAuthModalOpen(false);
        } else {
          setDrawerOpen(false);
        }
      } else if (e.key === 'ArrowRight') {
        setFocusedIndex((focusedIndex + 1) % AGENTS.length);
      } else if (e.key === 'ArrowLeft') {
        setFocusedIndex((focusedIndex - 1 + AGENTS.length) % AGENTS.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, setFocusedIndex, setDrawerOpen, authModalOpen, setAuthModalOpen]);

  useEffect(() => {
    useHealthcareStore.getState().fetchLatestReport();
  }, []);

  return (
    <div
      className="page-wrapper theme-light"
      style={{
        minHeight: '100svh',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#eceae5',
      }}
    >
      {/* Film Grain Noise Overlay */}
      <div data-grain-animate="true" className="grain" />

      {/* Minimal Top Navigation */}
      <nav
        className="nav"
        style={{
          position: 'fixed',
          top: 0,
          width: '100%',
          zIndex: 40,
          padding: '1.25em 2.5em',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          backgroundColor: 'rgba(236, 234, 229, 0.85)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <span className="subheading-xs" style={{ fontWeight: 700, letterSpacing: '0.18em' }}>
            CLINICAL HEALTHCARE SYSTEM
          </span>
          <span
            className="subheading-xs"
            style={{
              fontSize: '0.62rem',
              backgroundColor: '#111',
              color: '#fff',
              padding: '0.2rem 0.55rem',
            }}
          >
            ACTIVE & SECURE
          </span>
        </div>

        {/* Nav Right: Agent Selector Bar + Patient Auth Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          {/* Agent Selector Bar with Live State Indicators */}
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {AGENTS.map((ag, idx) => {
              const isSelected = focusedIndex === idx;
              const currentState = agentStates[ag.id] || (isSelected ? 'default' : 'sleeping');
              const stateIcon =
                currentState === 'working' ? '⚡' : currentState === 'sleeping' ? '💤' : '👁️';

              return (
                <button
                  key={ag.id}
                  onClick={() => handleAvatarClick(idx)}
                  className="subheading-xs"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    opacity: isSelected ? 1 : 0.45,
                    borderBottom: isSelected ? '1.5px solid #111' : '1.5px solid transparent',
                    paddingBottom: '0.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.2s',
                  }}
                >
                  <span>{stateIcon}</span>
                  <span>{ag.id.toUpperCase()}</span>
                  <span
                    style={{
                      fontSize: '0.58rem',
                      opacity: 0.7,
                      textTransform: 'uppercase',
                    }}
                  >
                    [{currentState}]
                  </span>
                </button>
              );
            })}
          </div>

          {/* Auth Patient Access Section */}
          <div style={{ borderLeft: '1px solid rgba(0,0,0,0.15)', paddingLeft: '1.25rem' }}>
            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.3rem 0.65rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #111',
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#16a34a', display: 'inline-block' }} />
                  <span className="subheading-xs" style={{ fontSize: '0.65rem', fontWeight: 700 }}>
                    PATIENT: {currentUser.fullName.toUpperCase()} (@{currentUser.username})
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="subheading-xs"
                  style={{
                    background: 'transparent',
                    border: '1px solid #111',
                    padding: '0.3rem 0.65rem',
                    cursor: 'pointer',
                    fontSize: '0.62rem',
                    fontWeight: 600,
                  }}
                  title="Sign out of patient session"
                >
                  [LOGOUT]
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true, 'login')}
                className="subheading-xs"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  backgroundColor: '#111',
                  color: '#fff',
                  border: '1px solid #111',
                  padding: '0.38rem 0.85rem',
                  cursor: 'pointer',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                }}
              >
                <span>👤</span>
                <span>LOG IN / SIGN UP</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Stage: Shifts Left when Right Drawer Opens */}
      <section
        style={{
          width: drawerOpen ? '44vw' : '100vw',
          height: '100svh',
          transition: 'width 0.65s cubic-bezier(0.32, 0.72, 0, 1)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '5.5rem 3rem 2.5rem 3rem',
        }}
      >
        {/* Top-Left Clinical Metadata Block */}
        <div
          className="experience_info"
          style={{
            maxWidth: drawerOpen ? '320px' : '420px',
            zIndex: 10,
            transition: 'all 0.4s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span
              className="subheading-xs"
              style={{
                color: activeAgent.color,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              ● {agentStates[activeAgent.id] === 'working' ? 'ACTIVELY COMMUNICATING' : 'ENGAGED & AWAKE'}
            </span>
          </div>

          <h1 className="heading-s" style={{ marginBottom: '0.6rem' }}>
            {activeAgent.name}
          </h1>

          <div className="info-content" style={{ width: '100%' }}>
            <div
              className="info-content_panel"
              style={{
                borderTop: '1px solid #111',
                padding: '0.45rem 0',
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              <span className="subheading-xs">AGENT ROLE</span>
              <span className="paragraph-m">{activeAgent.role}</span>
            </div>

            <div
              className="info-content_panel"
              style={{
                borderTop: '1px solid #111',
                padding: '0.45rem 0',
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              <span className="subheading-xs">AI MODEL</span>
              <span className="paragraph-m">{activeAgent.model}</span>
            </div>

            <div
              className="info-content_panel"
              style={{
                borderTop: '1px solid #111',
                padding: '0.45rem 0',
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              <span className="subheading-xs">CLINICAL FOCUS</span>
              <span className="paragraph-m" style={{ textAlign: 'right' }}>
                {activeAgent.capabilities.map((c, i) => (
                  <React.Fragment key={c}>
                    {c}
                    {i < activeAgent.capabilities.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </span>
            </div>
          </div>
        </div>

        {/* Diagonal Avatar Arc with Sleeping vs Working vs Default Animations */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {AGENTS.map((agent, index) => {
            const offset = index - focusedIndex;
            const isCurrent = offset === 0;

            // Inactive agents sleep ('sleeping') while active agent is awake ('default') or working ('working')
            const currentState = agentStates[agent.id] || (isCurrent ? 'default' : 'sleeping');

            // Diagonal trajectory
            const translateX = drawerOpen ? offset * 135 : offset * 280;
            const translateY = drawerOpen ? offset * -85 : offset * -125;
            const scale = isCurrent
              ? drawerOpen
                ? 1.15
                : 1.35
              : Math.max(0.55, 0.85 - Math.abs(offset) * 0.15);
            const opacity = drawerOpen && !isCurrent ? 0.22 : Math.abs(offset) > 2 ? 0 : 1;

            return (
              <div
                key={agent.id}
                onClick={() => handleAvatarClick(index)}
                style={{
                  position: 'absolute',
                  transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`,
                  transition:
                    'transform 0.65s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.45s ease',
                  opacity,
                  zIndex: 20 - Math.abs(offset),
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 210,
                    height: 210,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <BotAvatar
                    type={agent.avatarType}
                    state={currentState}
                    face="mouth"
                    glasses={agent.glasses}
                    hat={agent.hat}
                    headphones={agent.headphones}
                    bowTie={agent.bowTie}
                    whirl={1}
                    size={210}
                    shading="plastic"
                    speed={currentState === 'working' ? 1.25 : currentState === 'sleeping' ? 0.85 : 1.0}
                  />
                </div>

                <div
                  style={{
                    marginTop: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.2rem',
                  }}
                >
                  <span
                    className="subheading-xs"
                    style={{
                      opacity: isCurrent ? 0.95 : 0.45,
                      borderBottom: isCurrent ? '1px solid #111' : 'none',
                      paddingBottom: '0.15rem',
                      transition: 'opacity 0.3s',
                    }}
                  >
                    {isCurrent ? '[ CLICK TO OPEN CONSOLE ]' : agent.name}
                  </span>

                  <span
                    className="subheading-xs"
                    style={{
                      fontSize: '0.62rem',
                      opacity: isCurrent ? 0.85 : 0.35,
                      color:
                        currentState === 'working'
                          ? '#2563eb'
                          : currentState === 'sleeping'
                          ? '#6b7280'
                          : '#059669',
                    }}
                  >
                    {currentState === 'working'
                      ? '⚡ ACTIVE WORK'
                      : currentState === 'sleeping'
                      ? '💤 SLEEPING (IDLE)'
                      : '👁️ AWAKE & LISTENING'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Clinical Telemetry Status Bar */}
        <div
          className="testimonial_wrap"
          style={{
            marginLeft: 'auto',
            marginRight: 'auto',
            textAlign: 'center',
            zIndex: 10,
            opacity: drawerOpen ? 0 : 1,
            transition: 'opacity 0.35s ease',
          }}
        >
          <div style={{ maxWidth: '36rem' }}>
            <p className="subheading-xs" style={{ marginBottom: '0.35em', opacity: 0.8 }}>
              CARE COORDINATION // SPECIALIST CONSULTATION ACTIVE
            </p>
            <p className="paragraph-m" style={{ color: '#444' }}>
              Select any healthcare specialist to review your health biomarkers, customized supplement protocols, movement prescriptions, or schedule appointments.
            </p>
          </div>
        </div>
      </section>

      {/* Slide-over Agent Workspace Drawer */}
      {drawerOpen && (
        <AgentWorkspaceDrawer
          activeAgent={activeAgent}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {/* Patient Authentication Modal */}
      <AuthModal />
    </div>
  );
};