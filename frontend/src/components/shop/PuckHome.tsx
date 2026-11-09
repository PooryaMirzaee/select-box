"use client";

import { Render } from "@puckeditor/core";

import { puckConfig } from "@/puck/config";
import { DEFAULT_HOME_PUCK_DATA } from "@/puck/default-data";
import type { PuckMetadata, PuckPageData } from "@/puck/types";

type Props = {
  data: PuckPageData | null;
  metadata: PuckMetadata;
  /** اگر false باشد یعنی داده از API نیامده و باید fallback پیش‌فرض */
  useFallbackWhenEmpty?: boolean;
};

/** رندر عمومی چیدمان Puck روی صفحه اصلی */
export function PuckHome({ data, metadata, useFallbackWhenEmpty = true }: Props) {
  const hasPayload = Boolean(data);
  const emptyOnPurpose = hasPayload && Array.isArray(data?.content) && data!.content.length === 0;
  const resolved =
    !hasPayload && useFallbackWhenEmpty
      ? DEFAULT_HOME_PUCK_DATA
      : emptyOnPurpose
        ? { root: data?.root || DEFAULT_HOME_PUCK_DATA.root, content: [] as PuckPageData["content"] }
        : data && (data.content?.length || data.root)
          ? data
          : DEFAULT_HOME_PUCK_DATA;

  return <Render config={puckConfig} data={resolved} metadata={metadata} />;
}
