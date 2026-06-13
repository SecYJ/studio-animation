/** Fixed film-grain texture layered over the whole page. */
export function Grain() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999] bg-[length:220px_220px] opacity-45 mix-blend-soft-light"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 220 220' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
      aria-hidden="true"
    />
  );
}
