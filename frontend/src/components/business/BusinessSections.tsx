import type { BusinessProcessStep, BusinessUseCase } from "@/lib/api";

export function BusinessUseCases({ useCases }: { useCases: BusinessUseCase[] }) {
  if (!useCases.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <h2 className="text-xl font-semibold sm:text-2xl">کاربردها</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {useCases.map((uc) => (
          <div key={uc.title} className="card-theme p-5">
            <h3 className="font-medium">{uc.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{uc.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BusinessProcess({ steps }: { steps: BusinessProcessStep[] }) {
  if (!steps.length) return null;
  return (
    <section className="border-y border-theme bg-[var(--bg-elevated)]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="text-xl font-semibold sm:text-2xl">فرآیند سفارش</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li key={step.title} className="relative">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--accent-fg)]">
                {(i + 1).toLocaleString("fa-IR")}
              </span>
              <h3 className="mt-3 font-medium">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
