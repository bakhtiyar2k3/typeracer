import { useState } from 'react';
import { sound } from '../../services/sound.js';

// Speaker on/off toggle for keystroke sounds. Preference persists in the sound
// service (localStorage), so we just mirror it in local state for re-render.
export function SoundToggle() {
  const [on, setOn] = useState(() => sound.isEnabled());

  const toggle = () => {
    const next = !on;
    sound.setEnabled(next);
    setOn(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="nav-link"
      title={on ? 'sound on' : 'sound off'}
      aria-label={on ? 'Mute keystroke sounds' : 'Unmute keystroke sounds'}
      aria-pressed={on}
    >
      {on ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5 6 9H2v6h4l5 4V5z" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M19 5a9 9 0 0 1 0 14" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5 6 9H2v6h4l5 4V5z" />
          <line x1="22" y1="9" x2="16" y2="15" />
          <line x1="16" y1="9" x2="22" y2="15" />
        </svg>
      )}
    </button>
  );
}
