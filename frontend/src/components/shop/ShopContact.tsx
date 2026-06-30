"use client";

import type { ComponentType } from "react";

import {
  Clock,
  ExternalLink,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Telegram,
  Whatsapp,
  type BrutalIconProps,
} from "@/components/icons";
import type { ShopContactInfo } from "@/lib/contact-info";
import { buildContactLinks, hasContactInfo, pickContactInfo } from "@/lib/contact";
import { cn } from "@/lib/utils";

type Props = {
  contact: Partial<ShopContactInfo> | null | undefined;
  className?: string;
};

const ICONS: Record<string, ComponentType<BrutalIconProps>> = {
  phone: Phone,
  email: Mail,
  whatsapp: Whatsapp,
  telegram: Telegram,
  instagram: Instagram,
  address: MapPin,
};

function ContactIcon({
  name,
  className,
  size = 16,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  const Icon = ICONS[name] ?? ExternalLink;
  return <Icon className={className} size={size} />;
}

export function ContactTopBar({ contact, className }: Props) {
  const info = pickContactInfo(contact);
  if (!hasContactInfo(info)) return null;

  const links = buildContactLinks(info);
  const primary = links.filter((l) => ["phone", "email"].includes(l.key));
  const social = links.filter((l) => !["phone", "email", "address"].includes(l.key));

  return (
    <div
      className={cn(
        "hidden border-b border-theme/60 bg-[var(--bg-elevated)]/80 text-xs text-muted md:block",
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {primary.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className="inline-flex items-center gap-1.5 transition hover:text-[var(--fg)]"
            >
              <ContactIcon name={item.key} className="text-[var(--accent)]" />
              <span dir="ltr">{item.value}</span>
            </a>
          ))}
          {info.contact_hours ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="text-[var(--accent)]" size={16} />
              {info.contact_hours}
            </span>
          ) : null}
        </div>

        {social.length > 0 ? (
          <div className="flex items-center gap-2">
            {social.map((item) => (
              <a
                key={item.key}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full border border-theme/60 transition hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
                aria-label={item.label}
                title={item.value}
              >
                <ContactIcon name={item.key} size={15} />
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ContactFooterSection({ contact, className }: Props) {
  const info = pickContactInfo(contact);
  const links = buildContactLinks(info);

  if (!hasContactInfo(info)) return null;

  return (
    <div className={cn("text-sm", className)}>
      <p className="mb-3 font-medium">تماس با ما</p>
      <ul className="space-y-3 text-muted">
        {info.contact_hours ? (
          <li className="flex items-start gap-2.5">
            <Clock className="mt-0.5 shrink-0 text-[var(--accent)]" size={16} />
            <span>{info.contact_hours}</span>
          </li>
        ) : null}
        {links.map((item) => (
          <li key={item.key}>
            <a
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              className="group flex items-start gap-2.5 transition hover:text-[var(--fg)]"
            >
              <ContactIcon
                name={item.key}
                className="mt-0.5 shrink-0 text-[var(--accent)] transition group-hover:scale-105"
              />
              <span className="min-w-0 leading-relaxed">
                <span className="block text-[10px] uppercase tracking-wide text-muted/80">{item.label}</span>
                <span dir={item.key === "phone" || item.key === "whatsapp" ? "ltr" : undefined}>
                  {item.value}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ContactMobileSection({ contact, onNavigate, className }: Props & { onNavigate?: () => void }) {
  const info = pickContactInfo(contact);
  const links = buildContactLinks(info);

  if (!hasContactInfo(info)) return null;

  return (
    <div className={cn("mt-2 border-t border-theme pt-3", className)}>
      <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-muted">تماس</p>
      <div className="space-y-1">
        {info.contact_hours ? (
          <p className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted">
            <Clock className="text-[var(--accent)]" size={14} />
            {info.contact_hours}
          </p>
        ) : null}
        {links.map((item) => (
          <a
            key={item.key}
            href={item.href}
            onClick={onNavigate}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noopener noreferrer" : undefined}
            className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition hover:bg-[var(--bg-elevated)]"
          >
            <ContactIcon name={item.key} className="text-[var(--accent)]" />
            <span dir={item.key === "phone" || item.key === "whatsapp" ? "ltr" : undefined}>{item.value}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
