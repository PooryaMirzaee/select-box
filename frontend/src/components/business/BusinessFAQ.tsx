"use client";

import { useState } from "react";
import { ChevronDown } from "@/components/icons";

import type { BusinessFaq } from "@/lib/api";
import { cn } from "@/lib/utils";

export function BusinessFAQ({ faqs }: { faqs: BusinessFaq[] }) {
  const [open, setOpen] = useState<number | null>(0);
  if (!faqs.length) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <h2 className="text-xl font-semibold sm:text-2xl">سوالات متداول</h2>
      <div className="mt-6 space-y-2">
        {faqs.map((faq, i) => {
          const isOpen = open === i;
          return (
            <div key={faq.question} className="card-theme overflow-hidden">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 p-4 text-start text-sm font-medium sm:p-5 sm:text-base"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
              >
                {faq.question}
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition", isOpen && "rotate-180")} />
              </button>
              {isOpen ? (
                <div className="border-t border-theme px-4 pb-4 text-sm leading-relaxed text-muted sm:px-5 sm:pb-5">
                  {faq.answer}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
