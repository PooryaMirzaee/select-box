"use client";

import {
  AlignCenter,
  Copy,
  FlipHorizontal2,
  ImagePlus,
  Loader2,
  Minus,
  Palette,
  Plus,
  Save,
  Shirt,
  Sparkles,
  Trash2,
  Type,
  Upload,
  User,
  Wand,
  X,
} from "@/components/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChangeProductModal } from "@/components/design-lab/ChangeProductModal";
import {
  DesignLabCanvas,
  type DesignLabCanvasHandle,
  type TextStyle,
} from "@/components/design-lab/DesignLabCanvas";
import { DesignLabHeader } from "@/components/design-lab/DesignLabHeader";
import { DesignLabMobileContextBar } from "@/components/design-lab/DesignLabMobileContextBar";
import { useCanvasFit } from "@/lib/useCanvasFit";
import { DesignLabLoginModal } from "@/components/design-lab/DesignLabLoginModal";
import { DesignLabPublishModal } from "@/components/design-lab/DesignLabPublishModal";
import "@/components/design-lab/design-lab.css";
import { BRAND_NAME } from "@/lib/brand";
import { fetchAiStatus, generateAiImage, transformAiImage, type AiConfig, type AiHistoryItem, type AiQuota } from "@/lib/ai";
import { preloadBackgroundRemoval, removeImageBackgroundToDataUrl } from "@/lib/removeBackground";
import { prepareAiArtwork } from "@/lib/aiImagePost";
import { blobsToCustomizationPayload, stripDraftFromPayload } from "@/lib/buildCustomizationPayload";
import { ensureCartSession } from "@/lib/api";
import { getAuthToken } from "@/lib/cart-session";
import { CART_EVENTS } from "@/lib/storage-keys";
import {
  draftStorageKey,
  matchColorForTemplate,
  remapDesignDraft,
} from "@/lib/fabricMockup/remapDraft";
import {
  resolveTemplateSides,
  type SideId,
} from "@/lib/fabricMockup/templateSides";
import {
  DEFAULT_TRANSFORM,
  fetchDesignArtLibrary,
  type CustomizationPayload,
  type CustomizationTransform,
  type DesignArtClip,
  type ProductTemplate,
  addCustomToCart,
  publishDesign,
  uploadArtwork,
} from "@/lib/customizer";
import { mediaUrl } from "@/lib/media";
import { useTemplateFonts } from "@/lib/useTemplateFonts";
import { formatToman } from "@/lib/utils";

type ToolId = "upload" | "text" | "art" | "ai" | "names" | "product" | null;

const TOOL_TITLES: Record<Exclude<ToolId, null>, string> = {
  upload: "آپلود",
  text: "متن",
  art: "نگار",
  ai: "طراح هوشمند",
  names: "نام و شماره",
  product: "محصول",
};

const FALLBACK_ART: Record<string, string[]> = {
  محبوب: ["★", "♥", "⚡", "☀", "✓", "∞"],
};

const ZOOM_MIN = 0.75;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.1;

const BUILTIN_FONTS = [
  { name: "هلفتیکا", family: "Helvetica Neue, Helvetica, Arial, sans-serif" },
  { name: "جورجیا", family: "Georgia, serif" },
  { name: "کورییر", family: "Courier New, monospace" },
];

const COLOR_NAMES_FA: Record<string, string> = {
  White: "سفید",
  Black: "مشکی",
  Navy: "سرمه‌ای",
  Red: "قرمز",
  Blue: "آبی",
  Gray: "خاکستری",
  Grey: "خاکستری",
  Green: "سبز",
  Yellow: "زرد",
  Pink: "صورتی",
  Orange: "نارنجی",
  Purple: "بنفش",
  Brown: "قهوه‌ای",
  Default: "پیش‌فرض",
};

function faColorName(name: string): string {
  return COLOR_NAMES_FA[name] ?? name;
}

type Props = {
  template: ProductTemplate;
  allTemplates?: ProductTemplate[];
  templatesLoading?: boolean;
  onChangeProduct?: (
    next: ProductTemplate,
    transfer: { draft: Record<string, object[]>; zoom: number; colorHex: string },
  ) => void;
};

async function waitForCanvas(ref: React.RefObject<DesignLabCanvasHandle | null>, ms = 8000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (ref.current?.isReady()) return;
    await new Promise((r) => setTimeout(r, 40));
  }
  throw new Error("Canvas not ready");
}

export function DesignLab({
  template,
  allTemplates = [],
  templatesLoading = false,
  onChangeProduct,
}: Props) {
  const canvasRef = useRef<DesignLabCanvasHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const toolFileRef = useRef<HTMLInputElement>(null);
  const bgRemoveFileRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const draftKey = draftStorageKey(template.slug);

  /** مقیاس auto-fit بوم با اندازهٔ صحنه — بدون تغییر resolution داخلی */
  const fitScale = useCanvasFit(wrapRef);

  const sides = useMemo(
    () => resolveTemplateSides(template.config_json, template.slug),
    [template.config_json, template.slug],
  );
  const defaultSideId = sides[0]?.id ?? "front";
  const [view, setView] = useState<SideId>(defaultSideId);

  useEffect(() => {
    if (!sides.some((s) => s.id === view)) setView(defaultSideId);
  }, [sides, view, defaultSideId]);
  const [zoom, setZoom] = useState(1);
  const [activeTool, setActiveTool] = useState<ToolId>(null);
  const [mobileSheet, setMobileSheet] = useState<ToolId>(null);
  const [mobileStartOpen, setMobileStartOpen] = useState(true);
  const [hasDesign, setHasDesign] = useState(false);
  const [textInput, setTextInput] = useState("متن شما");
  const [nameText, setNameText] = useState("نام");
  const [numberText, setNumberText] = useState("00");
  const [artCategory, setArtCategory] = useState("");
  const [artLibrary, setArtLibrary] = useState<Record<string, DesignArtClip[]>>({});
  const [artLoading, setArtLoading] = useState(true);
  const [changeProductOpen, setChangeProductOpen] = useState(false);
  const [changingProduct, setChangingProduct] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [transform, setTransform] = useState<CustomizationTransform>({ ...DEFAULT_TRANSFORM });
  const [color, setColor] = useState(
    template.config_json.colors?.[0] ?? { name: "سفید", hex: "#f5f5f5" },
  );
  const [size, setSize] = useState(template.config_json.sizes?.[1] ?? "M");
  const [storageKey, setStorageKey] = useState("");
  const [uploading, setUploading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [priceOpen, setPriceOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"cart" | "publish" | "ai" | null>(null);
  const [customPayload, setCustomPayload] = useState<CustomizationPayload | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiQuota, setAiQuota] = useState<AiQuota | null>(null);
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const [aiHistory, setAiHistory] = useState<AiHistoryItem[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [pendingToolId, setPendingToolId] = useState<number | null>(null);
  const [activeSelection, setActiveSelection] = useState<"image" | "text" | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [bgRemoving, setBgRemoving] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  /** zoom مؤثر نمایش = مقیاس fit ضربدر zoom دستی کاربر */
  const effectiveZoom = +(fitScale * zoom).toFixed(3);

  const colors = template.config_json.colors ?? [];
  const sizes = template.config_json.sizes ?? [];
  const templateFonts = template.config_json.fonts ?? [];
  const fontOptions = [
    ...BUILTIN_FONTS,
    ...templateFonts.filter((f) => f.url && !BUILTIN_FONTS.some((b) => b.family === f.family)),
  ];

  const defaultTextStyle: TextStyle = useMemo(
    () => ({
      fontFamily: fontOptions[0]?.family ?? BUILTIN_FONTS[0].family,
      fontSize: 36,
      fill: "#222222",
      fontWeight: "normal",
    }),
    [fontOptions],
  );

  const [textStyle, setTextStyle] = useState<TextStyle>(defaultTextStyle);
  useTemplateFonts(templateFonts);

  const refreshAiStatus = useCallback(() => {
    fetchAiStatus()
      .then((s) => {
        setAiEnabled(s.enabled);
        setAiQuota(s.quota);
        setAiConfig(s.config);
        setAiHistory(s.history ?? []);
      })
      .catch(() => {
        setAiEnabled(false);
        setAiQuota(null);
        setAiConfig(null);
        setAiHistory([]);
      });
  }, []);

  useEffect(() => {
    refreshAiStatus();
  }, [refreshAiStatus]);

  useEffect(() => {
    void preloadBackgroundRemoval();
  }, []);

  useEffect(() => {
    fetchDesignArtLibrary()
      .then((data) => {
        setArtLibrary(data.categories);
        const cats = Object.keys(data.categories);
        setArtCategory(cats[0] ?? "محبوب");
      })
      .catch(() => setArtLibrary({}))
      .finally(() => setArtLoading(false));
  }, []);

  const artCategories = useMemo(() => {
    const cats = Object.keys(artLibrary);
    return cats.length ? cats : Object.keys(FALLBACK_ART);
  }, [artLibrary]);

  const handleCanvasReady = useCallback(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        draft?: Record<string, object[]>;
        zoom?: number;
        colorHex?: string;
      };
      if (data.draft) void canvasRef.current?.loadDraft(data.draft);
      if (data.zoom) setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, data.zoom)));
      if (data.colorHex) {
        const c = colors.find((x) => x.hex === data.colorHex);
        if (c) setColor(c);
      }
    } catch {
      /* ignore corrupt draft */
    }
  }, [colors, draftKey]);

  const handleSave = useCallback(() => {
    const draft = canvasRef.current?.saveDraft();
    if (!draft) return;
    localStorage.setItem(
      draftKey,
      JSON.stringify({ draft, zoom, colorHex: color.hex, savedAt: Date.now() }),
    );
    setSaveMsg("ذخیره شد");
    setTimeout(() => setSaveMsg(null), 2000);
  }, [color.hex, draftKey, zoom]);

  const handleTransformChange = useCallback((t: CustomizationTransform) => {
    setTransform(t);
  }, []);

  const handleDesignChange = useCallback((v: boolean) => {
    setHasDesign(v);
  }, []);

  const handleTextSelectionChange = useCallback((s: TextStyle | null, t?: string) => {
    if (s) {
      setTextStyle(s);
      setActiveTool("text");
    }
    if (t != null) setTextInput(t);
  }, []);

  const applyTextStyle = useCallback((patch: Partial<TextStyle>) => {
    setTextStyle((prev) => {
      const next = { ...prev, ...patch };
      canvasRef.current?.updateActiveText(patch);
      return next;
    });
  }, []);

  const addTextToCanvas = useCallback(() => {
    canvasRef.current?.addText(textInput, textStyle);
    setHasDesign(true);
    setMobileSheet(null);
  }, [textInput, textStyle]);

  const backSideId = sides.find((s) => s.id === "back")?.id ?? sides[sides.length - 1]?.id;

  const addNameNumber = useCallback(async () => {
    if (!backSideId) return;
    setActiveTool("names");
    await waitForCanvas(canvasRef);
    await canvasRef.current?.switchToView(backSideId);
    setView(backSideId);
    canvasRef.current?.addText(nameText, { ...textStyle, fontSize: 32, fontWeight: "bold" });
    canvasRef.current?.addText(numberText, { ...textStyle, fontSize: 48, fontWeight: "bold" });
    setHasDesign(true);
    setMobileSheet(null);
  }, [backSideId, nameText, numberText, textStyle]);

  const readDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(file);
    });

  const onFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;

    setUploading(true);
    setMessage(null);
    setActiveTool("upload");
    try {
      await waitForCanvas(canvasRef);
      for (const file of list) {
        const dataUrl = await readDataUrl(file);
        await canvasRef.current!.addImageFromUrl(dataUrl);
      }
      setHasDesign(true);
    } catch (err) {
      console.error("Design upload failed:", err);
      setMessage("خطا در نمایش تصویر — دوباره تلاش کنید");
      return;
    } finally {
      setUploading(false);
      setMobileSheet(null);
    }
  }, []);

  const handleGenerateAi = useCallback(async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      setAiError("توضیح طرح را بنویسید");
      return;
    }

    if (aiQuota?.require_login && !getAuthToken()) {
      setPendingAction("ai");
      setLoginOpen(true);
      setAiError("برای طراحی هوشمند وارد حساب شوید");
      return;
    }

    if (aiQuota && !aiQuota.can_generate) {
      setAiError(aiQuota.block_reason ?? "فعلاً امکان تولید تصویر نیست");
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setMessage(null);
    setActiveTool("ai");
    try {
      await waitForCanvas(canvasRef);
      const result = await generateAiImage(prompt);
      const cleanUrl = await prepareAiArtwork(result.image_url);
      await canvasRef.current!.addImageFromUrl(cleanUrl);
      setHasDesign(true);
      setMobileSheet(null);
      refreshAiStatus();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "خطا در تولید تصویر");
      refreshAiStatus();
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, aiQuota, refreshAiStatus]);

  const handleToolTransform = useCallback(async (file: File, toolId: number) => {
    if (aiQuota?.require_login && !getAuthToken()) {
      setPendingAction("ai");
      setLoginOpen(true);
      setAiError("برای طراحی هوشمند وارد حساب شوید");
      return;
    }
    if (aiQuota && !aiQuota.can_generate) {
      setAiError(aiQuota.block_reason ?? "فعلاً امکان تولید تصویر نیست");
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setMessage(null);
    setActiveTool("ai");
    try {
      await waitForCanvas(canvasRef);
      const result = await transformAiImage(toolId, file);
      const cleanUrl = await prepareAiArtwork(result.image_url);
      await canvasRef.current!.addImageFromUrl(cleanUrl);
      setHasDesign(true);
      setMobileSheet(null);
      refreshAiStatus();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "خطا در تبدیل تصویر");
      refreshAiStatus();
    } finally {
      setAiLoading(false);
      setPendingToolId(null);
    }
  }, [aiQuota, refreshAiStatus]);

  const handleToolFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || pendingToolId === null) return;
      void handleToolTransform(file, pendingToolId);
    },
    [handleToolTransform, pendingToolId],
  );

  const runRemoveBackground = useCallback(async (file: File, replaceActive = false) => {
    setBgRemoving(true);
    setMessage("در حال حذف پس‌زمینه…");
    setAiError(null);
    try {
      await waitForCanvas(canvasRef);
      const dataUrl = await removeImageBackgroundToDataUrl(file);
      if (replaceActive && canvasRef.current?.isActiveImage()) {
        await canvasRef.current.replaceActiveImageFromUrl(dataUrl);
      } else {
        await canvasRef.current!.addImageFromUrl(dataUrl);
        setHasDesign(true);
      }
      setMessage(null);
      setMobileSheet(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "خطا در حذف پس‌زمینه");
    } finally {
      setBgRemoving(false);
    }
  }, []);

  const handleRemoveBgFromSelection = useCallback(async () => {
    const blob = await canvasRef.current?.exportActiveImageBlob();
    if (!blob) {
      setMessage("یک تصویر روی بوم انتخاب کنید");
      return;
    }
    const file = new File([blob], "layer.png", { type: "image/png" });
    await runRemoveBackground(file, true);
  }, [runRemoveBackground]);

  const handleRemoveBgFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) void runRemoveBackground(file, false);
    },
    [runRemoveBackground],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length) void onFiles(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFiles]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (canvasRef.current?.deleteActiveObject()) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ارتفاع کیبورد موبایل را به CSS می‌دهد تا sheet پشت کیبورد پنهان نشود
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty("--dl-kb-offset", `${kb}px`);
    };
    onResize();
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
      document.documentElement.style.removeProperty("--dl-kb-offset");
    };
  }, []);

  // —— ژست‌های لمسی صحنه (pinch-zoom + double-tap برای تناسب) ——
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);
  const lastTapRef = useRef(0);

  const touchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handlePinchStart = useCallback(
    (e: React.TouchEvent) => {
      // فقط وقتی شیئی انتخاب نشده تا با تغییر اندازهٔ لایه تداخل نکند
      if (e.touches.length === 2 && !activeSelection) {
        pinchRef.current = { startDist: touchDistance(e.touches), startZoom: zoom };
      }
    },
    [activeSelection, zoom],
  );

  const handlePinchMove = useCallback((e: React.TouchEvent) => {
    const p = pinchRef.current;
    if (!p || e.touches.length !== 2) return;
    const ratio = touchDistance(e.touches) / p.startDist;
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(p.startZoom * ratio).toFixed(2)));
    setZoom(next);
  }, []);

  const handlePinchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length < 2) pinchRef.current = null;
      // دو ضربهٔ سریع روی فضای خالی → بازگشت به تناسب صفحه
      if (e.touches.length === 0 && e.changedTouches.length === 1 && !activeSelection) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          setZoom(1);
          lastTapRef.current = 0;
        } else {
          lastTapRef.current = now;
        }
      }
    },
    [activeSelection],
  );

  const buildCustomization = useCallback(async (): Promise<CustomizationPayload | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const [mockupBlobs, rawBlobs] = await Promise.all([
      canvas.exportAllViewBlobs(),
      canvas.exportAllRawViewBlobs(),
    ]);
    if (!mockupBlobs || !rawBlobs) return null;
    const draft = canvas.saveDraft();
    const rawViews: Record<string, string> = {};
    const previewViews: Record<string, string> = {};
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

    for (const [sideId, blob] of Object.entries(rawBlobs)) {
      if (!blob) continue;
      const res = await uploadArtwork(
        new File([blob], `${sideId}-print.png`, { type: "image/png" }),
      );
      rawViews[sideId] = res.storage_key;
    }

    for (const [sideId, blob] of Object.entries(mockupBlobs)) {
      if (!blob) continue;
      const res = await uploadArtwork(
        new File([blob], `${sideId}-mockup.png`, { type: "image/png" }),
      );
      previewViews[sideId] = res.storage_key;
    }

    const primaryPreview = previewViews[defaultSideId] ?? Object.values(previewViews)[0];
    if (!primaryPreview || !Object.keys(rawViews).length) return null;
    setStorageKey(primaryPreview);

    return {
      product_type: template.slug,
      artwork_url: `${apiBase}/api/v1/media/${primaryPreview}`,
      artwork_storage_key: primaryPreview,
      color_hex: color.hex,
      color_name: color.name,
      size_label: sizes.length ? size : null,
      transform,
      artwork_views: rawViews,
      preview_views: previewViews,
      views_draft: draft,
    };
  }, [color, defaultSideId, size, sizes.length, template.slug, transform]);

  const requireLogin = useCallback((action: "cart" | "publish") => {
    if (getAuthToken()) return true;
    setPendingAction(action);
    setLoginOpen(true);
    return false;
  }, []);

  const handleGetPrice = useCallback(async () => {
    if (!canvasRef.current?.hasDesignObjects()) {
      setMessage("اول یک طرح اضافه کنید");
      return;
    }
    setUploading(true);
    try {
      const payload = await buildCustomization();
      if (payload) setCustomPayload(payload);
      setPriceOpen(true);
    } finally {
      setUploading(false);
    }
  }, [buildCustomization]);

  const handleSellDesign = useCallback(async () => {
    if (!canvasRef.current?.hasDesignObjects()) {
      setMessage("اول یک طرح اضافه کنید");
      return;
    }
    if (!requireLogin("publish")) return;
    setUploading(true);
    try {
      const payload = await buildCustomization();
      if (!payload) {
        setMessage("طرح خالی است");
        return;
      }
      setCustomPayload(payload);
      setPublishOpen(true);
    } finally {
      setUploading(false);
    }
  }, [buildCustomization, requireLogin]);

  const handleAddToCart = useCallback(async () => {
    if (!template.default_variation_id) return;
    if (!requireLogin("cart")) return;
    setAdding(true);
    setMessage(null);
    try {
      const payload = customPayload || (await buildCustomization());
      if (!payload) {
        setMessage("اول یک طرح اضافه کنید");
        return;
      }
      const sid = await ensureCartSession();
      await addCustomToCart(template.default_variation_id, quantity, payload, sid);
      window.dispatchEvent(new CustomEvent(CART_EVENTS.update));
      window.dispatchEvent(new CustomEvent(CART_EVENTS.open));
      setMessage("به سبد اضافه شد ✓");
      setPriceOpen(false);
    } catch {
      setMessage("خطا در افزودن به سبد");
    } finally {
      setAdding(false);
    }
  }, [buildCustomization, customPayload, quantity, requireLogin, template]);

  const onLoginSuccess = useCallback(() => {
    setLoginOpen(false);
    refreshAiStatus();
    if (pendingAction === "cart") {
      setPendingAction(null);
      void handleAddToCart();
    } else if (pendingAction === "publish") {
      setPendingAction(null);
      void handleSellDesign();
    } else if (pendingAction === "ai") {
      setPendingAction(null);
      void handleGenerateAi();
    }
  }, [handleAddToCart, handleSellDesign, handleGenerateAi, pendingAction, refreshAiStatus]);

  const handleSelectProduct = useCallback(
    async (next: ProductTemplate) => {
      if (next.slug === template.slug || !onChangeProduct) return;
      setChangingProduct(true);
      try {
        await waitForCanvas(canvasRef);
        const draft = canvasRef.current?.saveDraft() ?? {};
        const remapped = remapDesignDraft(draft, template, next);
        const matched = matchColorForTemplate(color.hex, next);
        onChangeProduct(next, {
          draft: remapped,
          zoom,
          colorHex: matched.hex,
        });
      } finally {
        setChangingProduct(false);
        setChangeProductOpen(false);
      }
    },
    [color.hex, onChangeProduct, template, zoom],
  );

  const handlePublishSubmit = useCallback(
    async (data: { title: string; description?: string; productTypes: string[] }) => {
      const token = getAuthToken();
      if (!token) throw new Error("Unauthorized");

      await waitForCanvas(canvasRef);
      const sourceDraft = canvasRef.current?.saveDraft() ?? {};
      const customizationsByType: Record<string, CustomizationPayload> = {};

      for (const slug of data.productTypes) {
        const target =
          slug === template.slug ? template : allTemplates.find((t) => t.slug === slug);
        if (!target) continue;

        const remapped =
          slug === template.slug ? sourceDraft : remapDesignDraft(sourceDraft, template, target);
        const matchedColor = matchColorForTemplate(color.hex, target);
        const targetSizes = target.config_json.sizes ?? [];
        const targetSize = targetSizes.includes(size)
          ? size
          : (targetSizes[1] ?? targetSizes[0] ?? null);

        const { mockupBlobs, rawBlobs } = await canvasRef.current!.exportDraftForTemplate(
          target,
          remapped,
          matchedColor.hex,
        );
        const payload = await blobsToCustomizationPayload(target, mockupBlobs, rawBlobs, {
          color: matchedColor,
          transform,
          sizeLabel: targetSizes.length ? targetSize : null,
          draft: remapped,
        });
        if (!payload) throw new Error(`طرح برای «${target.name_fa}» خالی است`);
        customizationsByType[slug] = payload;
      }

      const primary = customizationsByType[template.slug] ?? Object.values(customizationsByType)[0];
      if (!primary) throw new Error("طرح خالی است");

      const stripped = Object.fromEntries(
        Object.entries(customizationsByType).map(([k, v]) => [k, stripDraftFromPayload(v)]),
      );

      return publishDesign(
        {
          title: data.title,
          description: data.description,
          product_types: data.productTypes,
          customization: stripDraftFromPayload(primary),
          customizations_by_type: stripped,
        },
        token,
      );
    },
    [allTemplates, buildCustomization, color.hex, size, template, transform],
  );

  const generateProductPreview = useCallback(
    async (target: ProductTemplate): Promise<string | null> => {
      const canvas = canvasRef.current;
      if (!canvas?.isReady()) return null;

      const sourceDraft = canvas.saveDraft();
      const hasDesign = Object.values(sourceDraft).some((side) => side?.length > 0);
      if (!hasDesign) return null;

      const remapped =
        target.slug === template.slug
          ? sourceDraft
          : remapDesignDraft(sourceDraft, template, target);
      const matchedColor = matchColorForTemplate(color.hex, target);

      const { mockupBlobs } = await canvas.exportDraftForTemplate(
        target,
        remapped,
        matchedColor.hex,
      );

      const sides = resolveTemplateSides(target.config_json, target.slug);
      const primarySide = sides[0]?.id ?? "front";
      const blob =
        mockupBlobs[primarySide] ??
        Object.values(mockupBlobs).find((b): b is Blob => b != null) ??
        null;
      if (!blob) return null;

      return URL.createObjectURL(blob);
    },
    [color.hex, template],
  );

  const totalPrice = Number(template.base_price) * quantity;
  const productLabel = template.name_fa;

  const rail = (
    <nav className="design-lab-rail" aria-label="ابزارها">
      {(
        [
          ["upload", Upload, "آپلود"],
          ...(aiEnabled ? ([["ai", Wand, "هوشمند"]] as const) : []),
          ["text", Type, "متن"],
          ["art", Sparkles, "نگار"],
          ["names", User, "نام/شماره"],
          ["product", Shirt, "محصول"],
        ] as const
      ).map(([id, Icon, label]) => (
        <button
          key={id}
          type="button"
          className={activeTool === id ? "is-active" : ""}
          onClick={() => {
            if (id === "upload") fileRef.current?.click();
            setActiveTool(id);
            setMobileSheet((cur) => (cur === id ? null : id));
            setMobileStartOpen(false);
          }}
        >
          <Icon size={22} strokeWidth={1.75} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );

  const layerActions = (
    <div className="design-lab-layer-actions">
      {activeSelection === "image" ? (
        <button
          type="button"
          disabled={bgRemoving}
          onClick={() => void handleRemoveBgFromSelection()}
        >
          {bgRemoving ? (
            <Loader2 size={14} className="inline mr-1 animate-spin" />
          ) : (
            <ImagePlus size={14} className="inline mr-1" />
          )}
          حذف پس‌زمینه
        </button>
      ) : null}
      <button type="button" onClick={() => void canvasRef.current?.duplicateActiveObject()}>
        <Copy size={14} className="inline mr-1" />
        کپی
      </button>
      <button type="button" onClick={() => canvasRef.current?.centerActiveObject()}>
        <AlignCenter size={14} className="inline mr-1" />
        وسط‌چین
      </button>
      <button type="button" onClick={() => canvasRef.current?.flipActiveObject()}>
        <FlipHorizontal2 size={14} className="inline mr-1" />
        آینه
      </button>
      <button type="button" onClick={() => canvasRef.current?.deleteActiveObject()}>
        <Trash2 size={14} className="inline mr-1" />
        حذف
      </button>
    </div>
  );

  const uploadPanel = (
    <div className="design-lab-panel-card">
      <h2>آپلود</h2>
      <p className="design-lab-panel-lead">
        فایل را از رایانه انتخاب کنید یا اینجا بکشید. PNG، JPG و WebP تا ۸ مگابایت.
      </p>
      <button type="button" className="dl-btn-upload" onClick={() => fileRef.current?.click()}>
        <Upload size={18} />
        انتخاب فایل
      </button>
      <button
        type="button"
        className="dl-btn-upload dl-btn-upload--secondary"
        disabled={bgRemoving}
        onClick={() => bgRemoveFileRef.current?.click()}
      >
        {bgRemoving ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <ImagePlus size={18} />
        )}
        آپلود + حذف پس‌زمینه
      </button>
      <input
        ref={bgRemoveFileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={handleRemoveBgFileChange}
      />
      {hasDesign ? layerActions : null}
      <p className="design-lab-hint design-lab-hint--desktop">
        کشیدن و رها کردن · چسباندن · کلید حذف برای پاک کردن لایه
      </p>
    </div>
  );

  const textPanel = (
    <div className="design-lab-panel-card">
      <h2>افزودن متن</h2>
      <label htmlFor="dl-text">متن</label>
      <input
        id="dl-text"
        type="text"
        value={textInput}
        onChange={(e) => {
          setTextInput(e.target.value);
          canvasRef.current?.setActiveTextContent(e.target.value);
        }}
      />
      <label htmlFor="dl-font">فونت</label>
      <select
        id="dl-font"
        value={textStyle.fontFamily}
        onChange={(e) => applyTextStyle({ fontFamily: e.target.value })}
      >
        {fontOptions.map((f) => (
          <option key={f.family} value={f.family}>
            {f.name}
          </option>
        ))}
      </select>
      <label htmlFor="dl-size">اندازه — {textStyle.fontSize}px</label>
      <input
        id="dl-size"
        type="range"
        min={16}
        max={96}
        value={textStyle.fontSize}
        onChange={(e) => applyTextStyle({ fontSize: Number(e.target.value) })}
      />
      <label htmlFor="dl-color">رنگ</label>
      <input
        id="dl-color"
        type="color"
        value={textStyle.fill}
        onChange={(e) => applyTextStyle({ fill: e.target.value })}
        className="dl-color-input"
      />
      <button
        type="button"
        className={`dl-btn-save w-full ${textStyle.fontWeight === "bold" ? "is-active" : ""}`}
        onClick={() =>
          applyTextStyle({ fontWeight: textStyle.fontWeight === "bold" ? "normal" : "bold" })
        }
      >
        ضخیم
      </button>
      <button type="button" className="dl-btn-next w-full" onClick={addTextToCanvas}>
        افزودن به طرح
      </button>
      {hasDesign ? layerActions : null}
    </div>
  );

  const artPanel = (
    <div className="design-lab-panel-card">
      <h2>افزودن نگار</h2>
      <p className="design-lab-panel-lead">از کتابخانهٔ طرح‌ها انتخاب کنید</p>
      {artLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          در حال بارگذاری…
        </div>
      ) : (
        <>
          <div className="design-lab-art-tabs">
            {artCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={artCategory === cat ? "is-active" : ""}
                onClick={() => setArtCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="design-lab-clip-grid">
            {(artLibrary[artCategory] ?? []).map((clip) => (
              <button
                key={clip.id}
                type="button"
                title={clip.title}
                className="design-lab-clip-image"
                onClick={() => {
                  void canvasRef.current?.addImageFromUrl(mediaUrl(clip.url)).then(() => {
                    setHasDesign(true);
                    setMobileSheet(null);
                  });
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={clip.url} alt={clip.title} />
              </button>
            ))}
            {!artLibrary[artCategory]?.length
              ? (FALLBACK_ART[artCategory] ?? FALLBACK_ART["محبوب"]).map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      canvasRef.current?.addEmojiArt(emoji);
                      setHasDesign(true);
                      setMobileSheet(null);
                    }}
                  >
                    {emoji}
                  </button>
                ))
              : null}
          </div>
        </>
      )}
      {hasDesign ? layerActions : null}
    </div>
  );

  const aiPanel = (
    <div className="design-lab-panel-card">
      <h2>طراح هوشمند {BRAND_NAME}</h2>
      <p className="design-lab-panel-lead">
        ایده‌تان را فارسی بنویسید — طرح چاپی تخت می‌سازیم (بدون تیشرت یا شطرنجی) و روی محصول
        می‌گذاریم.
      </p>
      <label htmlFor="dl-ai-prompt">توضیح طرح</label>
      <textarea
        id="dl-ai-prompt"
        rows={4}
        value={aiPrompt}
        placeholder="مثلاً: گل‌های آبی مینیمال"
        onChange={(e) => setAiPrompt(e.target.value)}
        className="design-lab-ai-textarea"
      />
      {aiConfig?.suggested_prompts?.length ? (
        <div className="design-lab-ai-hints">
          {aiConfig.suggested_prompts.map((hint) => (
            <button
              key={hint.id}
              type="button"
              className="design-lab-ai-hint"
              onClick={() => setAiPrompt(hint.text)}
            >
              {hint.label ?? hint.text}
            </button>
          ))}
        </div>
      ) : null}
      {aiConfig?.tools?.length ? (
        <div className="design-lab-ai-tools">
          <p className="design-lab-ai-tools-title">ابزار آماده — آپلود عکس</p>
          <p className="design-lab-hint">عکس خود را بدهید؛ AI برای چاپ روی محصول آماده‌اش می‌کند</p>
          <div className="design-lab-ai-tools-list">
            {aiConfig.tools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                className="design-lab-ai-tool"
                disabled={aiLoading || Boolean(aiQuota?.logged_in && aiQuota && !aiQuota.can_generate)}
                onClick={() => {
                  setPendingToolId(tool.id);
                  toolFileRef.current?.click();
                }}
              >
                <ImagePlus size={18} />
                <span>
                  <strong>{tool.name}</strong>
                  {tool.description ? (
                    <small>{tool.description}</small>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
          <input
            ref={toolFileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={handleToolFileChange}
          />
        </div>
      ) : null}
      {aiHistory.length ? (
        <div className="design-lab-ai-history">
          <p className="design-lab-ai-history-title">پرامپت‌های اخیر شما</p>
          <div className="design-lab-ai-hints">
            {aiHistory.map((item) => (
              <button
                key={`${item.created_at}-${item.prompt}`}
                type="button"
                className="design-lab-ai-hint design-lab-ai-hint--history"
                onClick={() => setAiPrompt(item.prompt)}
                title={item.status === "failed" ? "ناموفق" : "موفق"}
              >
                {item.prompt.length > 40 ? `${item.prompt.slice(0, 40)}…` : item.prompt}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {aiError ? <p className="design-lab-ai-error">{aiError}</p> : null}
      {aiQuota ? (
        <p className="design-lab-ai-quota">
          باقی‌مانده: {aiQuota.remaining_hour} در ساعت · {aiQuota.remaining_day} در روز
          {aiQuota.require_login && !aiQuota.logged_in ? " · ورود لازم است" : null}
        </p>
      ) : null}
      <button
        type="button"
        className="dl-btn-next w-full"
        disabled={
          aiLoading ||
          !aiPrompt.trim() ||
          Boolean(aiQuota?.logged_in && aiQuota && !aiQuota.can_generate)
        }
        onClick={() => void handleGenerateAi()}
      >
        {aiLoading ? (
          <>
            <Loader2 size={16} className="inline ms-1 animate-spin" />
            در حال ساخت…
          </>
        ) : (
          <>
            <Wand size={16} className="inline ms-1" />
            ساخت طرح
          </>
        )}
      </button>
      {hasDesign ? layerActions : null}
      {aiQuota?.block_reason && !aiQuota.can_generate ? (
        <p className="design-lab-hint">{aiQuota.block_reason}</p>
      ) : (
        <p className="design-lab-hint">
          هر {aiQuota?.cooldown_seconds ?? 45} ثانیه یک بار · حداکثر {aiQuota?.max_per_user_hour ?? 3} در ساعت
        </p>
      )}
    </div>
  );

  const namesPanel = (
    <div className="design-lab-panel-card">
      <h2>نام و شماره</h2>
      <p className="design-lab-panel-lead">نام و شماره را پشت محصول اضافه کنید</p>
      <label htmlFor="dl-name">نام</label>
      <input
        id="dl-name"
        type="text"
        value={nameText}
        onChange={(e) => setNameText(e.target.value)}
      />
      <label htmlFor="dl-number">شماره</label>
      <input
        id="dl-number"
        type="text"
        value={numberText}
        onChange={(e) => setNumberText(e.target.value)}
      />
      <label htmlFor="dl-names-font">فونت</label>
      <select
        id="dl-names-font"
        value={textStyle.fontFamily}
        onChange={(e) => applyTextStyle({ fontFamily: e.target.value })}
      >
        {fontOptions.map((f) => (
          <option key={f.family} value={f.family}>
            {f.name}
          </option>
        ))}
      </select>
      <button type="button" className="dl-btn-next w-full mt-4" onClick={() => void addNameNumber()}>
        افزودن به پشت
      </button>
    </div>
  );

  const productPanel = (
    <div className="design-lab-panel-card">
      <h2>رنگ محصول</h2>
      <p className="design-lab-panel-lead">رنگ {productLabel} را انتخاب کنید</p>
      <label>رنگ‌ها</label>
      <div className="design-lab-color-swatches">
        {colors.map((c) => (
          <button
            key={c.hex}
            type="button"
            title={faColorName(c.name)}
            className={`design-lab-color-swatch ${color.hex === c.hex ? "is-active" : ""}`}
            style={{ backgroundColor: c.hex }}
            onClick={() => setColor(c)}
          />
        ))}
      </div>
      {sizes.length > 0 ? (
        <>
          <label className="mt-4">سایز</label>
          <select value={size} onChange={(e) => setSize(e.target.value)}>
            {sizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </>
      ) : null}
      <button
        type="button"
        className="mt-4 text-sm text-[var(--dl-orange)] hover:underline"
        onClick={() => setChangeProductOpen(true)}
      >
        تغییر محصول
      </button>
    </div>
  );

  const openTool = useCallback((id: Exclude<ToolId, null>) => {
    setActiveTool(id);
    setMobileSheet(id);
    setMobileStartOpen(false);
  }, []);

  const startPanel = !hasDesign && (
    <div className="design-lab-panel-card">
      <h2>از کجا شروع کنیم؟</h2>
      <div className="design-lab-quick-grid">
        <button
          type="button"
          onClick={() => {
            setMobileStartOpen(false);
            fileRef.current?.click();
          }}
        >
          <Upload size={24} />
          آپلود
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTool("text");
            setMobileStartOpen(false);
            addTextToCanvas();
          }}
        >
          <Type size={24} />
          متن
        </button>
        <button type="button" onClick={() => openTool("art")}>
          <ImagePlus size={24} />
          نگار
        </button>
        {aiEnabled ? (
          <button type="button" onClick={() => openTool("ai")}>
            <Wand size={24} />
            هوشمند
          </button>
        ) : null}
        <button type="button" onClick={() => openTool("product")}>
          <Palette size={24} />
          رنگ
        </button>
      </div>
    </div>
  );

  const toolPanel =
    activeTool === "upload"
      ? uploadPanel
      : activeTool === "ai"
        ? aiPanel
        : activeTool === "text"
          ? textPanel
          : activeTool === "art"
            ? artPanel
            : activeTool === "names"
              ? namesPanel
              : activeTool === "product"
                ? productPanel
                : startPanel;

  return (
    <div className="design-lab-root">
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          const list = e.target.files;
          if (list?.length) void onFiles(list);
          e.target.value = "";
        }}
      />

      <DesignLabHeader
        productName={productLabel}
        onChangeProduct={() => setChangeProductOpen(true)}
        onSave={handleSave}
        saving={uploading}
      />
      <div className="design-lab-topbar-actions hidden border-b border-theme bg-[var(--dl-panel)] px-4 py-2 md:flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {saveMsg ? <span className="design-lab-save-msg truncate">{saveMsg}</span> : null}
          {uploading ? <Loader2 className="h-4 w-4 animate-spin text-muted" /> : null}
          <button type="button" className="dl-btn-save" onClick={handleSave}>
            <Save size={14} className="inline ms-1" />
            ذخیره
          </button>
        </div>
        <button type="button" className="dl-btn-next shrink-0" onClick={() => void handleGetPrice()}>
          قیمت و سفارش ←
        </button>
      </div>

      <div className="design-lab-body">
        <div className="design-lab-left hidden md:flex">
          {rail}
          <aside className="design-lab-sheet">{toolPanel}</aside>
        </div>

        <div className="design-lab-stage">
          <div
            ref={wrapRef}
            className="design-lab-canvas-wrap"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const list = e.dataTransfer.files;
              if (list.length) void onFiles(list);
            }}
            onTouchStart={handlePinchStart}
            onTouchMove={handlePinchMove}
            onTouchEnd={handlePinchEnd}
          >
            <DesignLabCanvas
              ref={canvasRef}
              productType={template.slug}
              colorHex={color.hex}
              view={view}
              sides={sides}
              zoom={effectiveZoom}
              templateConfig={template.config_json}
              defaultTextStyle={defaultTextStyle}
              onTransformChange={handleTransformChange}
              onDesignChange={handleDesignChange}
              onReady={handleCanvasReady}
              onTextSelectionChange={handleTextSelectionChange}
              onSelectionChange={setActiveSelection}
            />
          </div>

          <aside className="design-lab-view-rail">
            {sides.map((side) => (
              <button
                key={side.id}
                type="button"
                className={`design-lab-view-thumb ${view === side.id ? "is-active" : ""}`}
                onClick={() => setView(side.id)}
              >
                <span className="design-lab-view-thumb-img" data-view={side.id} />
                <span>{side.label_fa}</span>
              </button>
            ))}
            <div className="design-lab-zoom-stack">
              <button
                type="button"
                aria-label="بزرگ‌نمایی"
                disabled={zoom >= ZOOM_MAX}
                onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                aria-label="کوچک‌نمایی"
                disabled={zoom <= ZOOM_MIN}
                onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
              >
                <Minus size={16} />
              </button>
              <button
                type="button"
                className="design-lab-zoom-fit"
                aria-label="تناسب با صفحه"
                disabled={zoom === 1}
                onClick={() => setZoom(1)}
              >
                تناسب
              </button>
            </div>
          </aside>
        </div>
      </div>

      <footer className="design-lab-bottombar">
        <div className="design-lab-bottombar-info min-w-0">
          <strong>{productLabel}</strong>
          <span className="mx-2 text-[#999]">·</span>
          <span>{faColorName(color.name)}</span>
          {sizes.length ? (
            <>
              <span className="mx-2 text-[#999]">·</span>
              <span>{size}</span>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="design-lab-sell-link text-xs text-muted underline-offset-2 hover:text-[var(--fg)] hover:underline"
            onClick={() => void handleSellDesign()}
          >
            ثبت در ویترین من
          </button>
          <button type="button" className="dl-btn-price" onClick={() => void handleGetPrice()}>
            قیمت و سفارش ←
          </button>
        </div>
      </footer>

      {/* نوار ابزار شناور لایه — موبایل، وقتی sheet بسته است */}
      {!mobileSheet ? (
        <DesignLabMobileContextBar
          selection={activeSelection}
          bgRemoving={bgRemoving}
          onRemoveBg={() => void handleRemoveBgFromSelection()}
          onDuplicate={() => void canvasRef.current?.duplicateActiveObject()}
          onCenter={() => canvasRef.current?.centerActiveObject()}
          onFlip={() => canvasRef.current?.flipActiveObject()}
          onDelete={() => canvasRef.current?.deleteActiveObject()}
        />
      ) : null}

      {/* نوار ابزار اصلی — موبایل، چسبیده به پایین */}
      <div className="design-lab-mobile md:hidden">{rail}</div>

      {/* شروع سریع — موبایل، وقتی هنوز طرحی نیست */}
      {!hasDesign && mobileStartOpen && !mobileSheet ? (
        <div className="design-lab-mobile-sheet-wrap md:hidden">
          <div className="design-lab-mobile-sheet" role="dialog" aria-label="شروع طراحی">
            <div className="design-lab-mobile-sheet-head">
              <span>از کجا شروع کنیم؟</span>
              <button
                type="button"
                aria-label="بستن"
                onClick={() => setMobileStartOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="design-lab-mobile-sheet-body">{startPanel}</div>
          </div>
        </div>
      ) : null}

      {/* شیت ابزار — موبایل، overlay با backdrop */}
      {mobileSheet ? (
        <div className="design-lab-mobile-sheet-wrap md:hidden">
          <div
            className="design-lab-mobile-sheet-backdrop"
            onClick={() => setMobileSheet(null)}
            aria-hidden
          />
          <div className="design-lab-mobile-sheet" role="dialog" aria-label={TOOL_TITLES[mobileSheet]}>
            <div className="design-lab-mobile-sheet-head">
              <span>{TOOL_TITLES[mobileSheet]}</span>
              <button type="button" aria-label="بستن" onClick={() => setMobileSheet(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="design-lab-mobile-sheet-body">{toolPanel}</div>
          </div>
        </div>
      ) : null}

      {priceOpen ? (
        <div className="design-lab-modal-backdrop">
          <div className="design-lab-modal">
            <h2>قیمت</h2>
            <p className="text-sm text-[#666]">
              {productLabel} · {faColorName(color.name)}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <label className="text-sm">تعداد</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-20 rounded border px-2 py-1"
              />
            </div>
            <p className="mt-4 text-2xl font-bold">{formatToman(String(totalPrice))}</p>
            <div className="mt-6 flex gap-2">
              <button type="button" className="dl-btn-save flex-1" onClick={() => setPriceOpen(false)}>
                بازگشت
              </button>
              <button type="button" className="dl-btn-next flex-1" disabled={adding} onClick={() => void handleAddToCart()}>
                {adding ? "..." : "خرید"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {message && !priceOpen && !publishOpen ? <div className="design-lab-toast">{message}</div> : null}

      {loginOpen ? (
        <DesignLabLoginModal onClose={() => setLoginOpen(false)} onSuccess={onLoginSuccess} />
      ) : null}

      {publishOpen && customPayload ? (
        <DesignLabPublishModal
          currentTemplateSlug={template.slug}
          allTemplates={allTemplates.length ? allTemplates : [template]}
          templatesLoading={templatesLoading}
          generateProductPreview={generateProductPreview}
          currentPreviewUrl={customPayload.artwork_url}
          onClose={() => setPublishOpen(false)}
          onSubmit={handlePublishSubmit}
          onPublished={(r) => {
            setPublishOpen(false);
            const titles = r.product_titles ?? [];
            setMessage(
              r.message ??
                (titles.length > 1
                  ? `${titles.length} محصول (${titles.join("، ")}) ثبت شد — پس از تأیید در ویترین نمایش داده می‌شوند`
                  : titles[0]
                    ? `«${titles[0]}» ثبت شد — پس از تأیید در ویترین و استودیوی شما نمایش داده می‌شود`
                    : "اثر ثبت شد — در حساب و استودیو قابل مشاهده است"),
            );
          }}
          onNeedLogin={() => {
            setPublishOpen(false);
            setPendingAction("publish");
            setLoginOpen(true);
          }}
        />
      ) : null}

      {changeProductOpen ? (
        <ChangeProductModal
          currentSlug={template.slug}
          templates={allTemplates.length ? allTemplates : [template]}
          loading={templatesLoading || changingProduct}
          onClose={() => setChangeProductOpen(false)}
          onSelect={(t) => void handleSelectProduct(t)}
        />
      ) : null}
    </div>
  );
}
