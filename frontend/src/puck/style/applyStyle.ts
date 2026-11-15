import type { CSSProperties } from "react";
import type { ChromeProps } from "./types";

const SHADOWS: Record<string, string> = {
  none: "",
  soft: "0 4px 24px rgba(15, 23, 42, 0.06)",
  card: "0 1px 3px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)",
  custom: "",
};

export function pickChrome(props: Partial<ChromeProps>): ChromeProps {
  return {
    padT: props.padT ?? "",
    padR: props.padR ?? "",
    padB: props.padB ?? "",
    padL: props.padL ?? "",
    marginT: props.marginT ?? "",
    marginB: props.marginB ?? "",
    gap: props.gap ?? "",
    padTMobile: props.padTMobile ?? "",
    padBMobile: props.padBMobile ?? "",
    bgColor: props.bgColor ?? "",
    bgGradient: props.bgGradient ?? "",
    bgImage: props.bgImage ?? "",
    bgOverlay: props.bgOverlay ?? "",
    textColor: props.textColor ?? "",
    fontSize: props.fontSize ?? "",
    fontWeight: props.fontWeight ?? "",
    lineHeight: props.lineHeight ?? "",
    letterSpacing: props.letterSpacing ?? "",
    textAlign: props.textAlign ?? "start",
    borderWidth: props.borderWidth ?? "",
    borderStyle: props.borderStyle ?? "solid",
    borderColor: props.borderColor ?? "",
    borderRadius: props.borderRadius ?? "",
    shadow: props.shadow ?? "none",
    shadowCustom: props.shadowCustom ?? "",
    widthMode: props.widthMode ?? "container",
    maxWidth: props.maxWidth ?? "",
    customCss: props.customCss ?? "",
    htmlId: props.htmlId ?? "",
    cssClass: props.cssClass ?? "",
    hideOnMobile: Boolean(props.hideOnMobile),
    hideOnDesktop: Boolean(props.hideOnDesktop),
    opacity: props.opacity ?? "",
    overflow: props.overflow ?? "",
    zIndex: props.zIndex ?? "",
    animation: props.animation ?? "none",
  };
}

export function chromeToStyle(chrome: ChromeProps): CSSProperties {
  const style: CSSProperties = {};

  if (chrome.padT) style.paddingTop = chrome.padT;
  if (chrome.padR) style.paddingRight = chrome.padR;
  if (chrome.padB) style.paddingBottom = chrome.padB;
  if (chrome.padL) style.paddingLeft = chrome.padL;
  if (chrome.marginT) style.marginTop = chrome.marginT;
  if (chrome.marginB) style.marginBottom = chrome.marginB;
  if (chrome.gap) style.gap = chrome.gap;

  if (chrome.bgGradient) {
    style.backgroundImage = chrome.bgGradient;
  } else if (chrome.bgImage) {
    style.backgroundImage = `url(${chrome.bgImage})`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
  }
  if (chrome.bgColor) style.backgroundColor = chrome.bgColor;

  if (chrome.textColor) style.color = chrome.textColor;
  if (chrome.fontSize) style.fontSize = chrome.fontSize;
  if (chrome.fontWeight) style.fontWeight = chrome.fontWeight as CSSProperties["fontWeight"];
  if (chrome.lineHeight) style.lineHeight = chrome.lineHeight;
  if (chrome.letterSpacing) style.letterSpacing = chrome.letterSpacing;
  if (chrome.textAlign) style.textAlign = chrome.textAlign;

  if (chrome.borderWidth) {
    style.borderWidth = chrome.borderWidth;
    style.borderStyle = (chrome.borderStyle || "solid") as CSSProperties["borderStyle"];
    if (chrome.borderColor) style.borderColor = chrome.borderColor;
  }
  if (chrome.borderRadius) style.borderRadius = chrome.borderRadius;

  const shadow =
    chrome.shadow === "custom"
      ? chrome.shadowCustom
      : SHADOWS[chrome.shadow] || "";
  if (shadow) style.boxShadow = shadow;

  if (chrome.widthMode === "custom" && chrome.maxWidth) {
    style.maxWidth = chrome.maxWidth;
    style.marginInline = "auto";
    style.width = "100%";
  } else if (chrome.widthMode === "full") {
    style.width = "100%";
    style.maxWidth = "none";
  }

  if (chrome.opacity) style.opacity = Number(chrome.opacity) || undefined;
  if (chrome.overflow) style.overflow = chrome.overflow as CSSProperties["overflow"];
  if (chrome.zIndex) style.zIndex = Number(chrome.zIndex) || undefined;

  return style;
}

export function chromeClassName(chrome: ChromeProps, extra?: string): string {
  const parts: string[] = [];
  if (extra) parts.push(extra);
  if (chrome.cssClass) parts.push(chrome.cssClass);
  if (chrome.widthMode === "container") parts.push("shop-container");
  if (chrome.hideOnMobile) parts.push("max-md:!hidden");
  if (chrome.hideOnDesktop) parts.push("md:!hidden");
  if (chrome.animation === "fadeIn") parts.push("animate-in fade-in duration-500");
  if (chrome.animation === "slideUp") parts.push("animate-in fade-in slide-in-from-bottom-3 duration-500");
  return parts.filter(Boolean).join(" ");
}

/** CSS موبایل برای پدینگ دو‌سطحی */
export function chromeMobileCss(puckId: string, chrome: ChromeProps): string {
  if (!chrome.padTMobile && !chrome.padBMobile) return "";
  const decls: string[] = [];
  if (chrome.padTMobile) decls.push(`padding-top: ${chrome.padTMobile} !important`);
  if (chrome.padBMobile) decls.push(`padding-bottom: ${chrome.padBMobile} !important`);
  return `@media (max-width: 767px) { [data-puck-id="${puckId}"] { ${decls.join(";")} } }`;
}
