export function PageHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-seed-200 bg-white px-5 py-6 md:px-10 md:py-8">
      <div>
        {eyebrow && (
          <div className="mb-1 text-[13px] font-semibold uppercase tracking-[0.14em] text-melon-600">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-[38px] font-medium leading-tight tracking-tight text-seed-900 md:text-[44px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-[15px] text-seed-500">
            {subtitle}
          </p>
        )}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </header>
  );
}
