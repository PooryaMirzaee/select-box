"use client";

import { Render } from "@puckeditor/core";

import { puckConfig } from "@/puck/config";
import { DEFAULT_HOME_PUCK_DATA } from "@/puck/default-data";
import { migratePuckData, pageScopeId, sanitizeCss, scopeCss } from "@/puck/style";
import type { PuckMetadata, PuckPageData } from "@/puck/types";

type Props = {
  data: PuckPageData | null;
  metadata: PuckMetadata;
  /** اگر false باشد یعنی داده از API نیامده و باید fallback پیش‌فرض */
  useFallbackWhenEmpty?: boolean;
  /** slug صفحه برای scope CSS سراسری */
  slug?: string;
};

/** رندر عمومی چیدمان Puck */
export function PuckHome({
  data,
  metadata,
  useFallbackWhenEmpty = true,
  slug = "home",
}: Props) {
  const hasPayload = Boolean(data);
  const emptyOnPurpose =
    hasPayload && Array.isArray(data?.content) && data!.content.length === 0;
  const raw =
    !hasPayload && useFallbackWhenEmpty
      ? DEFAULT_HOME_PUCK_DATA
      : emptyOnPurpose
        ? {
            root: data?.root || DEFAULT_HOME_PUCK_DATA.root,
            content: [] as PuckPageData["content"],
          }
        : data && (data.content?.length || data.root)
          ? data
          : DEFAULT_HOME_PUCK_DATA;

  const resolved = migratePuckData(raw) as PuckPageData;
  const rootProps = (resolved.root?.props || {}) as {
    pageCustomCss?: string;
    title?: string;
  };
  const pageCss = rootProps.pageCustomCss
    ? scopeCss(`#${pageScopeId(slug)}`, sanitizeCss(rootProps.pageCustomCss))
    : "";

  return (
    <div id={pageScopeId(slug)}>
      <Render config={puckConfig} data={resolved} metadata={metadata} />
      {pageCss ? <style dangerouslySetInnerHTML={{ __html: pageCss }} /> : null}
    </div>
  );
}
