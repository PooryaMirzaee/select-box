"use client";

import type { CSSProperties, ElementType, ReactNode } from "react";
import {
  chromeClassName,
  chromeMobileCss,
  chromeToStyle,
  pickChrome,
} from "./applyStyle";
import { scopeCss } from "./sanitizeCss";
import type { ChromeProps } from "./types";

type Props = {
  id?: string;
  chrome: Partial<ChromeProps>;
  className?: string;
  as?: ElementType;
  children: ReactNode;
  style?: CSSProperties;
};

export function BlockShell({
  id,
  chrome: raw,
  className,
  as: Tag = "div",
  children,
  style: extraStyle,
}: Props) {
  const chrome = pickChrome(raw);
  const puckId = id || chrome.htmlId || undefined;
  const style = { ...chromeToStyle(chrome), ...extraStyle };
  const scoped =
    puckId && chrome.customCss
      ? scopeCss(`[data-puck-id="${puckId}"]`, chrome.customCss)
      : "";
  const mobile = puckId ? chromeMobileCss(puckId, chrome) : "";

  return (
    <Tag
      id={chrome.htmlId || undefined}
      data-puck-id={puckId}
      className={chromeClassName(chrome, className)}
      style={style}
    >
      {chrome.bgOverlay ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: chrome.bgOverlay,
            borderRadius: "inherit",
          }}
        />
      ) : null}
      {children}
      {scoped || mobile ? (
        <style dangerouslySetInnerHTML={{ __html: `${scoped}\n${mobile}` }} />
      ) : null}
    </Tag>
  );
}
