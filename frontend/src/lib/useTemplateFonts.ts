"use client";

import { useEffect } from "react";

import type { TemplateFont } from "@/lib/fabricMockup/templateMockup";
import { mediaUrl } from "@/lib/media";

export function useTemplateFonts(fonts: TemplateFont[] | undefined) {
  useEffect(() => {
    if (!fonts?.length) return;
    let cancelled = false;

    void (async () => {
      for (const f of fonts) {
        if (!f.url || cancelled) continue;
        try {
          const src = mediaUrl(f.url);
          const face = new FontFace(f.family, `url(${src})`);
          const loaded = await face.load();
          if (!cancelled) document.fonts.add(loaded);
        } catch {
          /* skip broken font files */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fonts]);
}
