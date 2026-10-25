import React, { useState, useEffect } from 'react';
import { useHealthcareStore } from '../../store/useHealthcareStore';
import { X, Lock, User as UserIcon, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    setAuthModalOpen,
    authMode,
    setAuthMode,
    authLoading,
    authError,
    setAuthError,
    login,
    signup,
  } = useHealthcareStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Reset form error when modal opens or mode switches
  useEffect(() => {
    if (authModalOpen) {
      setAuthError(null);
    }
  }, [authModalOpen, authMode, setAuthError]);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setAuthError('Please enter both username and password.');
      return;
    }

    if (authMode === 'login') {
      await login(username.trim(), password);
    } else {
      await signup(username.trim(), password, username.trim());
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 17, 23, 0.65)',
        backdropFilter: 'blur(8px)',
        padding: '1.5rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setAuthModalOpen(false);
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#faf8f5',
          border: '1.5px solid #111',
          boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Modal Top Bar */}
        <div
          style={{
            padding: '1.15rem 1.5rem',
            backgroundColor: '#111',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheck size={18} style={{ color: '#4ade80' }} />
            <div>
              <span className="subheading-xs" style={{ letterSpacing: '0.15em', fontWeight: 700, color: '#fff' }}>
                ACCOUNT ACCESS
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: '0.58rem',
                  color: '#9ca3af',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                SECURE AUTHENTICATION
              </span>
            </div>
          </div>
          <button
            onClick={() => setAuthModalOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '0.2rem',
              opacity: 0.8,
            }}
            title="Close [ESC]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher: LOG IN vs SIGN UP */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #111',
            backgroundColor: '#ede9e3',
          }}
        >
          <button
            type="button"
            onClick={() => setAuthMode('login')}
            className="subheading-xs"
            style={{
              flex: 1,
              padding: '0.9rem',
              border: 'none',
              borderRight: '1px solid #111',
              backgroundColor: authMode === 'login' ? '#faf8f5' : 'transparent',
              fontWeight: authMode === 'login' ? 700 : 500,
              cursor: 'pointer',
              color: '#111',
              transition: 'background-color 0.15s',
            }}
          >
            LOG IN
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('signup')}
            className="subheading-xs"
            style={{
              flex: 1,
              padding: '0.9rem',
              border: 'none',
              backgroundColor: authMode === 'signup' ? '#faf8f5' : 'transparent',
              fontWeight: authMode === 'signup' ? 700 : 500,
              cursor: 'pointer',
              color: '#111',
              transition: 'background-color 0.15s',
            }}
          >
            SIGN UP
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.75rem 1.75rem 1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {authError && (
            <div
              style={{
                backgroundColor: '#fee2e2',
                border: '1px solid #ef4444',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                color: '#991b1b',
              }}
            >
              <AlertCircle size={16} style={{ marginTop: '0.15rem', flexShrink: 0 }} />
              <div style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                {authError}
              </div>
            </div>
          )}

          {/* Username */}
          <div>
            <label
              className="subheading-xs"
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.4rem', color: '#111', fontWeight: 600 }}
            >
              <UserIcon size={14} />
              <span>USERNAME</span>
            </label>
            <input
              type="text"
              required
              minLength={3}
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
              placeholder="Enter your username"
              style={{
                width: '100%',
                padding: '0.75rem 0.9rem',
                border: '1px solid #111',
                backgroundColor: '#fff',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Password */}
          <div>
            <label
              className="subheading-xs"
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.4rem', color: '#111', fontWeight: 600 }}
            >
              <Lock size={14} />
              <span>PASSWORD</span>
            </label>
            <input
              type="password"
              required
              minLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '0.75rem 0.9rem',
                border: '1px solid #111',
                backgroundColor: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={authLoading}
            className="subheading-xs"
            style={{
              marginTop: '0.5rem',
              padding: '0.95rem 1.25rem',
              backgroundColor: '#111',
              color: '#fff',
              border: 'none',
              cursor: authLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              opacity: authLoading ? 0.7 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {authLoading
              ? authMode === 'login'
                ? 'LOGGING IN...'
                : 'CREATING ID...'
              : authMode === 'login'
              ? 'LOG IN'
              : 'CREATE ID & LOG IN'}
            {!authLoading && <ArrowRight size={14} />}
          </button>
        </form>
      </div>
    </div>
  );
};
