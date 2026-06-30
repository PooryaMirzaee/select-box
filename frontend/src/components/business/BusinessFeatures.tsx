import type { ComponentType } from "react";

import {
  Check,
  Coffee,
  Package,
  Shirt,
  Sparkles,
} from "@/components/icons";
import type { BusinessFeature } from "@/lib/api";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  package: Package,
  sparkles: Sparkles,
  check: Check,
  shirt: Shirt,
  coffee: Coffee,
};

export function BusinessFeatureIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICON_MAP[icon] ?? Package;
  return <Icon className={cn("h-5 w-5", className)} />;
}

export function BusinessFeatures({ features }: { features: BusinessFeature[] }) {
  if (!features.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <h2 className="text-xl font-semibold sm:text-2xl">چرا CORALAY برای سازمان‌ها؟</h2>
      <p className="mt-2 max-w-lg text-sm text-muted">کیفیت، شفافیت قیمت و پشتیبانی اختصاصی.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="card-theme p-5 transition hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <BusinessFeatureIcon icon={f.icon} />
            </div>
            <h3 className="mt-4 font-medium">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
