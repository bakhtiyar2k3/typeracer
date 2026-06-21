// Small labelled metric used across the typing HUD and profile pages.
export function Stat({ label, value, accent = false, className = '' }) {
  return (
    <div className={`flex flex-col ${className}`}>
      <span className="text-xs uppercase tracking-wider text-secondary">{label}</span>
      <span className={`text-2xl font-medium ${accent ? 'text-accent' : 'text-text'}`}>
        {value}
      </span>
    </div>
  );
}
