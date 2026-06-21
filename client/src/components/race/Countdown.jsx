// Big animated 3 / 2 / 1 / GO overlay shown before the race begins.
export function Countdown({ value, go }) {
  const label = go || value === 0 ? 'GO' : value;
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div
        key={label}
        className={`animate-pop text-8xl font-bold ${go || value === 0 ? 'text-accent' : 'text-text'}`}
      >
        {label}
      </div>
      <p className="mt-4 text-sm text-secondary">get ready…</p>
    </div>
  );
}
