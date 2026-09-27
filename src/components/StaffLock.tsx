import { motion, useAnimationControls } from 'framer-motion';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../lib/store';
import { Lock, Unlock } from './Icons';
import { Modal } from './Modal';

// Optional staff PIN: when set, creating/editing/deleting/importing games asks for it,
// so a player who taps the back arrow can't open the editor and peek at the answers.

interface GateValue {
  /** Runs `action` right away, or after the staff PIN is entered. */
  guard(action: () => void): void;
  openLockSettings(): void;
}

const GateContext = createContext<GateValue | null>(null);

export function StaffGateProvider({ children }: { children: ReactNode }) {
  const { settings, staffUnlocked, setStaffUnlocked } = useStore();
  const [asking, setAsking] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pending = useRef<(() => void) | null>(null);

  const guard = useCallback(
    (action: () => void) => {
      if (!settings.pin || staffUnlocked) {
        action();
        return;
      }
      pending.current = action;
      setAsking(true);
    },
    [settings.pin, staffUnlocked],
  );

  const openLockSettings = useCallback(() => {
    guard(() => setSettingsOpen(true));
  }, [guard]);

  return (
    <GateContext.Provider value={{ guard, openLockSettings }}>
      {children}
      <Modal open={asking} onClose={() => setAsking(false)} title="Staff only">
        <PinPad
          prompt="Enter the staff PIN"
          onSubmit={(pin) => {
            if (pin !== settings.pin) return false;
            setStaffUnlocked(true);
            setAsking(false);
            const action = pending.current;
            pending.current = null;
            // Let the modal close before navigating.
            setTimeout(() => action?.(), 120);
            return true;
          }}
        />
      </Modal>
      <LockSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </GateContext.Provider>
  );
}

export function useStaffGate(): GateValue {
  const v = useContext(GateContext);
  if (!v) throw new Error('useStaffGate must be used inside <StaffGateProvider>');
  return v;
}

function LockSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings, setStaffUnlocked } = useStore();
  const [step, setStep] = useState<'menu' | 'new' | 'confirm'>('menu');
  const [draft, setDraft] = useState('');

  const close = () => {
    onClose();
    setTimeout(() => setStep('menu'), 250);
  };

  return (
    <Modal open={open} onClose={close} title="Staff lock">
      {step === 'menu' && (
        <div className="lock-menu">
          <div className={`lock-status ${settings.pin ? 'on' : 'off'}`}>
            {settings.pin ? <Lock size={22} /> : <Unlock size={22} />}
            <div>
              <strong>{settings.pin ? 'Editing is locked' : 'Editing is unlocked'}</strong>
              <p>
                {settings.pin
                  ? 'Players can play, but creating, editing, importing or deleting games needs the PIN.'
                  : 'Anyone holding the iPad can open the editor and see the answers. Set a PIN before the event.'}
              </p>
            </div>
          </div>
          <div className="stack-buttons">
            <button className="btn btn-primary" onClick={() => setStep('new')}>
              {settings.pin ? 'Change PIN' : 'Set a 4-digit PIN'}
            </button>
            {settings.pin && (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setStaffUnlocked(false);
                    close();
                  }}
                >
                  Lock now
                </button>
                <button
                  className="btn btn-ghost danger-text"
                  onClick={() => {
                    updateSettings({ pin: null });
                    close();
                  }}
                >
                  Turn off the lock
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {step === 'new' && (
        <PinPad
          key="new"
          prompt="Choose a 4-digit PIN"
          onSubmit={(pin) => {
            setDraft(pin);
            setStep('confirm');
            return true;
          }}
        />
      )}
      {step === 'confirm' && (
        <PinPad
          key="confirm"
          prompt="Type it again to confirm"
          onSubmit={(pin) => {
            if (pin !== draft) return false;
            updateSettings({ pin });
            setStaffUnlocked(true);
            close();
            return true;
          }}
        />
      )}
    </Modal>
  );
}

function PinPad({ prompt, onSubmit }: { prompt: string; onSubmit: (pin: string) => boolean }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const shake = useAnimationControls();

  const press = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      setTimeout(() => {
        if (!onSubmit(next)) {
          setError(true);
          void shake.start({ x: [0, -14, 14, -10, 10, -4, 0], transition: { duration: 0.4 } });
          setPin('');
        }
      }, 120);
    }
  };

  return (
    <div className="pinpad">
      <p className={`pin-prompt${error ? ' error' : ''}`}>{error ? 'Wrong PIN — try again' : prompt}</p>
      <motion.div className="pin-dots" animate={shake}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`pin-dot${i < pin.length ? ' filled' : ''}`} />
        ))}
      </motion.div>
      <div className="pin-keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              className="pin-key"
              aria-label={k === '⌫' ? 'Delete' : k}
              onClick={() => (k === '⌫' ? setPin((p) => p.slice(0, -1)) : press(k))}
            >
              {k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
