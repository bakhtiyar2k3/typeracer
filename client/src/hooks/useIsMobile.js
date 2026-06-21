import { useEffect, useState } from 'react';

// Tracks a max-width media query. Ranked multiplayer is disabled on mobile per
// the MVP spec, so the UI uses this to gate the "Find Match" flow.
export function useIsMobile(maxWidth = 768) {
  const query = `(max-width: ${maxWidth}px)`;
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return isMobile;
}
