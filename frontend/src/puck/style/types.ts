/** کنترلرهای مشترک ظاهر/فاصله/پیشرفته برای همهٔ بلوک‌ها */

export type WidthMode = "full" | "container" | "custom";
export type AnimationKind = "none" | "fadeIn" | "slideUp";
export type ShadowPreset = "none" | "soft" | "card" | "custom";
export type TextAlign = "start" | "center" | "end";

export type ChromeProps = {
  /** فاصله */
  padT: string;
  padR: string;
  padB: string;
  padL: string;
  marginT: string;
  marginB: string;
  gap: string;
  padTMobile: string;
  padBMobile: string;

  /** ظاهر */
  bgColor: string;
  bgGradient: string;
  bgImage: string;
  bgOverlay: string;
  textColor: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  textAlign: TextAlign;
  borderWidth: string;
  borderStyle: string;
  borderColor: string;
  borderRadius: string;
  shadow: ShadowPreset;
  shadowCustom: string;
  widthMode: WidthMode;
  maxWidth: string;

  /** پیشرفته */
  customCss: string;
  htmlId: string;
  cssClass: string;
  hideOnMobile: boolean;
  hideOnDesktop: boolean;
  opacity: string;
  overflow: string;
  zIndex: string;
  animation: AnimationKind;
};

export const DEFAULT_CHROME: ChromeProps = {
  padT: "",
  padR: "",
  padB: "",
  padL: "",
  marginT: "",
  marginB: "",
  gap: "",
  padTMobile: "",
  padBMobile: "",
  bgColor: "",
  bgGradient: "",
  bgImage: "",
  bgOverlay: "",
  textColor: "",
  fontSize: "",
  fontWeight: "",
  lineHeight: "",
  letterSpacing: "",
  textAlign: "start",
  borderWidth: "",
  borderStyle: "solid",
  borderColor: "",
  borderRadius: "",
  shadow: "none",
  shadowCustom: "",
  widthMode: "container",
  maxWidth: "",
  customCss: "",
  htmlId: "",
  cssClass: "",
  hideOnMobile: false,
  hideOnDesktop: false,
  opacity: "",
  overflow: "",
  zIndex: "",
  animation: "none",
};

export type WithChrome<T> = T & ChromeProps;
