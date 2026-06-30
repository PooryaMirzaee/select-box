"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { fetchCustomizerTemplate, fetchCustomizerTemplates, type ProductTemplate } from "@/lib/customizer";
import { draftStorageKey } from "@/lib/fabricMockup/remapDraft";

const DesignLab = dynamic(
  () => import("@/components/design-lab/DesignLab").then((m) => m.DesignLab),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 flex items-center justify-center bg-[#e8e8e8] text-sm text-[#666]">
        در حال بارگذاری آزمایشگاه طراحی…
      </div>
    ),
  },
);

type Props = { template: ProductTemplate };

export function CustomizeDesignLabClient({ template: initialTemplate }: Props) {
  const router = useRouter();
  const [template, setTemplate] = useState(initialTemplate);
  const [allTemplates, setAllTemplates] = useState<ProductTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  useEffect(() => {
    setTemplate(initialTemplate);
  }, [initialTemplate]);

  useEffect(() => {
    fetchCustomizerTemplate(template.slug)
      .then(setTemplate)
      .catch(() => {});
  }, [template.slug]);

  useEffect(() => {
    fetchCustomizerTemplates()
      .then(setAllTemplates)
      .catch(() => setAllTemplates([]))
      .finally(() => setTemplatesLoading(false));
  }, []);

  const handleChangeProduct = useCallback(
    (
      next: ProductTemplate,
      transfer: { draft: Record<string, object[]>; zoom: number; colorHex: string },
    ) => {
      localStorage.setItem(
        draftStorageKey(next.slug),
        JSON.stringify({ ...transfer, savedAt: Date.now() }),
      );
      router.replace(`/customize/${next.slug}`);
    },
    [router],
  );

  return (
    <DesignLab
      key={`${template.slug}-${template.id}`}
      template={template}
      allTemplates={allTemplates}
      templatesLoading={templatesLoading}
      onChangeProduct={handleChangeProduct}
    />
  );
}
