export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center" role="status" aria-label="Loading">
      <span className="grid grid-cols-3 gap-[3px]" aria-hidden>
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className="size-[5px] animate-pixel-on bg-ink-3" style={{ animationDelay: `${(i * 137) % 900}ms` }} />
        ))}
      </span>
    </div>
  );
}
