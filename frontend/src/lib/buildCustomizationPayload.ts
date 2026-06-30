import type { CustomizationPayload, CustomizationTransform, ProductTemplate } from "@/lib/customizer";
import { uploadArtwork } from "@/lib/customizer";
import { resolveTemplateSides } from "@/lib/fabricMockup/templateSides";
import type { DesignDraft } from "@/components/design-lab/DesignLabCanvas";

export async function blobsToCustomizationPayload(
  target: ProductTemplate,
  mockupBlobs: Record<string, Blob | null>,
  rawBlobs: Record<string, Blob | null>,
  opts: {
    color: { name: string; hex: string };
    transform: CustomizationTransform;
    sizeLabel?: string | null;
    draft?: DesignDraft;
  },
): Promise<CustomizationPayload | null> {
  const rawViews: Record<string, string> = {};
  const previewViews: Record<string, string> = {};
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  for (const [sideId, blob] of Object.entries(rawBlobs)) {
    if (!blob) continue;
    const res = await uploadArtwork(
      new File([blob], `${target.slug}-${sideId}-print.png`, { type: "image/png" }),
    );
    rawViews[sideId] = res.storage_key;
  }

  for (const [sideId, blob] of Object.entries(mockupBlobs)) {
    if (!blob) continue;
    const res = await uploadArtwork(
      new File([blob], `${target.slug}-${sideId}-mockup.png`, { type: "image/png" }),
    );
    previewViews[sideId] = res.storage_key;
  }

  const sides = resolveTemplateSides(target.config_json, target.slug);
  const primarySide = sides[0]?.id ?? "front";
  const primaryPreview = previewViews[primarySide] ?? Object.values(previewViews)[0];
  if (!primaryPreview || !Object.keys(rawViews).length) return null;

  return {
    product_type: target.slug,
    artwork_url: `${apiBase}/api/v1/media/${primaryPreview}`,
    artwork_storage_key: primaryPreview,
    color_hex: opts.color.hex,
    color_name: opts.color.name,
    size_label: opts.sizeLabel ?? null,
    transform: opts.transform,
    artwork_views: rawViews,
    preview_views: previewViews,
    views_draft: opts.draft,
  };
}

export function stripDraftFromPayload(payload: CustomizationPayload): CustomizationPayload {
  const { views_draft: _draft, ...rest } = payload;
  return rest;
}
