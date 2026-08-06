export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-0.5 w-full bg-[var(--reader-rule)]">
      <div
        className="h-full bg-[var(--reader-fg)] transition-[width] duration-150"
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
      />
    </div>
  );
}
