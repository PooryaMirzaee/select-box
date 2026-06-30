"use client";

import { Canvas, FabricImage, type FabricObject, IText, StaticCanvas, util } from "fabric";
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MOCKUP_STAGE_BG,
} from "@/lib/fabricMockup/designLabCanvas";
import { applyFabricPrintBlend } from "@/lib/fabricMockup/basicMockup";
import {
  buildTemplateBackground,
  drawDesignLayerWithPrintBlend,
  type MockupView,
} from "@/lib/fabricMockup/templateMockup";
import {
  getSidePrintArea,
  resolveTemplateSides,
  type PrintAreaPx,
  type TemplateSide,
} from "@/lib/fabricMockup/templateSides";
import { fabricObjectToTransform } from "@/lib/fabricMockup/effectRenderer";
import {
  loadCorsSafeImage,
  needsCanvasSrcRefresh,
  normalizeCanvasImageSrc,
} from "@/lib/corsImage";
import type { CustomizationTransform, ProductTemplate } from "@/lib/customizer";

export { CANVAS_WIDTH, CANVAS_HEIGHT };

export type TextStyle = {
  fontFamily: string;
  fontSize: number;
  fill: string;
  fontWeight: "normal" | "bold";
};

export type DesignDraft = Record<string, object[]>;

export type DesignLabCanvasHandle = {
  addImageFromUrl: (url: string) => Promise<void>;
  addText: (text?: string, style?: Partial<TextStyle>) => void;
  addEmojiArt: (emoji: string) => void;
  updateActiveText: (style: Partial<TextStyle>) => void;
  setActiveTextContent: (text: string) => void;
  getActiveTextStyle: () => TextStyle | null;
  isActiveImage: () => boolean;
  exportActiveImageBlob: () => Promise<Blob | null>;
  replaceActiveImageFromUrl: (url: string) => Promise<boolean>;
  deleteActiveObject: () => boolean;
  duplicateActiveObject: () => Promise<void>;
  flipActiveObject: () => void;
  centerActiveObject: () => void;
  switchToView: (v: MockupView) => Promise<void>;
  exportViewBlob: (view: MockupView) => Promise<Blob | null>;
  exportAllViewBlobs: () => Promise<Record<string, Blob | null>>;
  exportAllRawViewBlobs: () => Promise<Record<string, Blob | null>>;
  exportDesignBlob: () => Promise<Blob | null>;
  hasDesignObjects: () => boolean;
  isReady: () => boolean;
  getView: () => MockupView;
  saveDraft: () => DesignDraft;
  loadDraft: (draft: DesignDraft) => Promise<void>;
  exportDraftForTemplate: (
    targetTemplate: ProductTemplate,
    draft: DesignDraft,
    colorHex: string,
  ) => Promise<{
    mockupBlobs: Record<string, Blob | null>;
    rawBlobs: Record<string, Blob | null>;
  }>;
};

type Props = {
  productType: string;
  colorHex: string;
  view: MockupView;
  sides: TemplateSide[];
  zoom?: number;
  templateConfig: ProductTemplate["config_json"];
  defaultTextStyle: TextStyle;
  onTransformChange?: (t: CustomizationTransform) => void;
  onDesignChange?: (hasDesign: boolean) => void;
  onTextSelectionChange?: (style: TextStyle | null, text?: string) => void;
  onSelectionChange?: (kind: "image" | "text" | null) => void;
  onReady?: () => void;
};

const DEFAULT_TEXT: TextStyle = {
  fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
  fontSize: 36,
  fill: "#222222",
  fontWeight: "normal",
};

function constrainObjectToPrintArea(obj: FabricObject, area: PrintAreaPx) {
  obj.setCoords();
  const br = obj.getBoundingRect();
  let dx = 0;
  let dy = 0;
  if (br.left < area.left) dx = area.left - br.left;
  if (br.top < area.top) dy = area.top - br.top;
  if (br.left + br.width > area.left + area.width) {
    dx = area.left + area.width - (br.left + br.width);
  }
  if (br.top + br.height > area.top + area.height) {
    dy = area.top + area.height - (br.top + br.height);
  }
  if (dx || dy) {
    obj.set({ left: (obj.left ?? 0) + dx, top: (obj.top ?? 0) + dy });
    obj.setCoords();
  }
}

/** موقعیت اولیه — مرکز محدوده چاپ ساید فعال */
function objectPlacement(area: PrintAreaPx, offset = 0) {
  return {
    originX: "center" as const,
    originY: "center" as const,
    left: area.centerX + offset,
    top: area.centerY + offset,
    selectable: true,
    evented: true,
    lockScalingFlip: true,
  };
}

function isTextObject(o: unknown): o is IText {
  return typeof o === "object" && o !== null && (o as IText).type === "i-text";
}

function isImageObject(o: unknown): o is FabricImage {
  return typeof o === "object" && o !== null && (o as FabricObject).type === "image";
}

function textStyleFromObject(obj: IText): TextStyle {
  return {
    fontFamily: String(obj.fontFamily ?? DEFAULT_TEXT.fontFamily),
    fontSize: Number(obj.fontSize ?? DEFAULT_TEXT.fontSize),
    fill: String(obj.fill ?? DEFAULT_TEXT.fill),
    fontWeight: obj.fontWeight === "bold" ? "bold" : "normal",
  };
}

function fabricImageSrc(obj: FabricImage): string | null {
  const el = obj.getElement?.() as HTMLImageElement | undefined;
  if (el?.src) return el.src;
  const raw = (obj as unknown as { src?: string }).src;
  return raw ?? null;
}

function sanitizeSnapshotObject(raw: object): object {
  const json = { ...raw } as { type?: string; src?: string };
  if (json.type === "image" && json.src) {
    json.src = normalizeCanvasImageSrc(json.src);
  }
  return json;
}

async function refreshFabricImageSources(objs: (FabricImage | IText)[]) {
  for (const o of objs) {
    if (o.type !== "image") continue;
    const img = o as FabricImage;
    const src = fabricImageSrc(img);
    if (!src || !needsCanvasSrcRefresh(src)) continue;
    const safeSrc = normalizeCanvasImageSrc(src);
    const el = await loadCorsSafeImage(safeSrc);
    img.setElement(el);
    img.set({ dirty: true });
    img.setCoords();
  }
}

async function enlivenDesignSnapshots(snap: object[]) {
  const objs = await util.enlivenObjects<FabricImage | IText>(snap);
  await refreshFabricImageSources(objs);
  return objs;
}

function recalcCanvas(fc: Canvas) {
  fc.calcOffset();
  fc.requestRenderAll();
}

function fitFabricImageToCanvas(img: FabricImage, width: number, height: number) {
  if (!img.width || !img.height) return;
  img.set({
    originX: "left",
    originY: "top",
    left: 0,
    top: 0,
    scaleX: width / img.width,
    scaleY: height / img.height,
  });
}

function isFabricCanvasLive(fc: Canvas): boolean {
  const internal = fc as unknown as { lowerCanvasEl?: HTMLCanvasElement; disposed?: boolean };
  if (internal.disposed) return false;
  return Boolean(internal.lowerCanvasEl?.isConnected);
}

function applyZoom(fc: Canvas, zoom: number, host: HTMLDivElement | null) {
  if (!isFabricCanvasLive(fc)) return;
  const w = Math.round(CANVAS_WIDTH * zoom);
  const h = Math.round(CANVAS_HEIGHT * zoom);
  if (host) {
    host.style.width = `${w}px`;
    host.style.height = `${h}px`;
  }
  try {
    fc.setDimensions({ width: w, height: h });
    fc.setZoom(zoom);
    recalcCanvas(fc);
  } catch {
    /* canvas disposed mid-frame */
  }
}

export const DesignLabCanvas = memo(
  forwardRef<DesignLabCanvasHandle, Props>(function DesignLabCanvas(
    {
      productType,
      colorHex,
      view,
      sides,
      zoom = 1,
      templateConfig,
      defaultTextStyle,
      onTransformChange,
      onDesignChange,
      onTextSelectionChange,
      onSelectionChange,
      onReady,
    },
    ref,
  ) {
    const hostRef = useRef<HTMLDivElement>(null);
    const mountRef = useRef<HTMLDivElement>(null);
    const fabricRef = useRef<Canvas | null>(null);
    const readyRef = useRef(false);
    const canvasGenRef = useRef(0);
    const bgLoadSeq = useRef(0);
    const prevColorHexRef = useRef(colorHex);
  const viewSnapshots = useRef<Record<string, object[]>>({});
  const sidesRef = useRef(sides);
  const [showPrintBounds, setShowPrintBounds] = useState(false);
  /** نمای واقعی canvas — جدا از prop تا switchView درست کار کند */
  const canvasViewRef = useRef<MockupView>(view);
    const zoomRef = useRef(zoom);
    const colorHexRef = useRef(colorHex);
    const productTypeRef = useRef(productType);
    const templateConfigRef = useRef(templateConfig);
    const defaultTextStyleRef = useRef(defaultTextStyle);
    const onReadyRef = useRef(onReady);
    const onDesignChangeRef = useRef(onDesignChange);
    const onTransformChangeRef = useRef(onTransformChange);
    const onTextSelectionChangeRef = useRef(onTextSelectionChange);
    const onSelectionChangeRef = useRef(onSelectionChange);

    colorHexRef.current = colorHex;
    productTypeRef.current = productType;
    templateConfigRef.current = templateConfig;
    defaultTextStyleRef.current = defaultTextStyle;
    onReadyRef.current = onReady;
    onDesignChangeRef.current = onDesignChange;
    onTransformChangeRef.current = onTransformChange;
    onTextSelectionChangeRef.current = onTextSelectionChange;
    onSelectionChangeRef.current = onSelectionChange;
  zoomRef.current = zoom;
  sidesRef.current = sides;

  useEffect(() => {
    const next: Record<string, object[]> = { ...viewSnapshots.current };
    for (const s of sides) {
      if (!next[s.id]) next[s.id] = [];
    }
    viewSnapshots.current = next;
  }, [sides]);

  const currentPrintArea = useCallback((): PrintAreaPx => {
    return getSidePrintArea(
      templateConfigRef.current,
      productTypeRef.current,
      canvasViewRef.current,
    );
  }, []);

    const designCount = useCallback((fc: Canvas) => fc.getObjects().length, []);

    const applyPrintBlendToObjects = useCallback((fc: Canvas) => {
      for (const o of fc.getObjects()) {
        applyFabricPrintBlend(o, colorHexRef.current);
      }
      fc.requestRenderAll();
    }, []);

    const syncTransform = useCallback(() => {
      const fc = fabricRef.current;
      if (!fc || !onTransformChangeRef.current) return;
      const obj = fc.getActiveObject();
      if (obj) {
        onTransformChangeRef.current(
          fabricObjectToTransform(obj, CANVAS_WIDTH, CANVAS_HEIGHT),
        );
      }
    }, []);

    const notifyDesign = useCallback(() => {
      const fc = fabricRef.current;
      if (!fc || !onDesignChangeRef.current) return;
      onDesignChangeRef.current(designCount(fc) > 0);
    }, [designCount]);

    const notifySelection = useCallback(() => {
      const fc = fabricRef.current;
      const obj = fc?.getActiveObject();
      if (isTextObject(obj)) {
        onTextSelectionChangeRef.current?.(textStyleFromObject(obj), obj.text ?? "");
        onSelectionChangeRef.current?.("text");
      } else if (isImageObject(obj)) {
        onTextSelectionChangeRef.current?.(null);
        onSelectionChangeRef.current?.("image");
      } else {
        onTextSelectionChangeRef.current?.(null);
        onSelectionChangeRef.current?.(null);
      }
    }, []);

  const saveViewSnapshot = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    viewSnapshots.current[canvasViewRef.current] = fc
      .getObjects()
      .map((o) => sanitizeSnapshotObject(o.toObject() as object));
  }, []);

    const removeDesignObjects = useCallback((fc: Canvas) => {
      fc.discardActiveObject();
      for (const o of [...fc.getObjects()]) fc.remove(o);
    }, []);

    const applyMockupBackground = useCallback(async (fc: Canvas, mockupView: MockupView) => {
      const seq = ++bgLoadSeq.current;
      const el = await buildTemplateBackground(
        templateConfigRef.current,
        productTypeRef.current,
        colorHexRef.current,
        mockupView,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
      );
      if (seq !== bgLoadSeq.current || fabricRef.current !== fc || !isFabricCanvasLive(fc)) return;

      const prev = fc.backgroundImage;
      const bg = new FabricImage(el);
      fitFabricImageToCanvas(bg, CANVAS_WIDTH, CANVAS_HEIGHT);
      fc.backgroundImage = bg;
      fc.backgroundVpt = false;
      if (prev && prev !== bg) prev.dispose();
      recalcCanvas(fc);
    }, []);

    const restoreDesignObjects = useCallback(
      async (fc: Canvas, mockupView: MockupView) => {
        removeDesignObjects(fc);
        const snap = viewSnapshots.current[mockupView];
        if (snap.length) {
          const objs = await enlivenDesignSnapshots(snap);
          for (const o of objs) {
            o.set({ selectable: true, evented: true });
            applyFabricPrintBlend(o, colorHexRef.current);
            o.setCoords();
            fc.add(o);
          }
        }
        recalcCanvas(fc);
        notifyDesign();
      },
      [notifyDesign, removeDesignObjects],
    );

  const switchView = useCallback(
    async (next: MockupView) => {
      const fc = fabricRef.current;
      if (!fc || !readyRef.current || canvasViewRef.current === next) return;
      saveViewSnapshot();
      canvasViewRef.current = next;
      await applyMockupBackground(fc, next);
      await restoreDesignObjects(fc, next);
    },
    [applyMockupBackground, restoreDesignObjects, saveViewSnapshot],
  );

  type ExportContext = {
    config: ProductTemplate["config_json"];
    productType: string;
    colorHex: string;
    snapshots: Record<string, object[]>;
  };

  const renderViewBlobFor = useCallback(
    async (mockupView: MockupView, ctx: ExportContext): Promise<Blob | null> => {
      const snap = ctx.snapshots[mockupView];
      if (!snap?.length) return null;

      const out = document.createElement("canvas");
      out.width = CANVAS_WIDTH;
      out.height = CANVAS_HEIGHT;
      const canvasCtx = out.getContext("2d");
      if (!canvasCtx) return null;

      canvasCtx.fillStyle = MOCKUP_STAGE_BG;
      canvasCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const bgEl = await buildTemplateBackground(
        ctx.config,
        ctx.productType,
        ctx.colorHex,
        mockupView,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
      );
      canvasCtx.drawImage(bgEl, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const layerEl = document.createElement("canvas");
      const layer = new StaticCanvas(layerEl, {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      });
      layer.backgroundColor = "transparent";
      const objs = await enlivenDesignSnapshots(snap);
      for (const o of objs) {
        applyFabricPrintBlend(o, ctx.colorHex);
        layer.add(o);
      }
      layer.renderAll();
      drawDesignLayerWithPrintBlend(canvasCtx, layerEl, ctx.colorHex, CANVAS_WIDTH, CANVAS_HEIGHT);
      layer.dispose();

      return new Promise((resolve) => {
        out.toBlob((blob) => resolve(blob), "image/png");
      });
    },
    [],
  );

  const renderRawViewBlobFor = useCallback(
    async (mockupView: MockupView, ctx: ExportContext): Promise<Blob | null> => {
      const snap = ctx.snapshots[mockupView];
      if (!snap?.length) return null;

      const layerEl = document.createElement("canvas");
      const layer = new StaticCanvas(layerEl, {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      });
      layer.backgroundColor = "transparent";
      const objs = await enlivenDesignSnapshots(snap);
      for (const o of objs) layer.add(o);
      layer.renderAll();

      const out = document.createElement("canvas");
      out.width = CANVAS_WIDTH;
      out.height = CANVAS_HEIGHT;
      const canvasCtx = out.getContext("2d");
      if (!canvasCtx) {
        layer.dispose();
        return null;
      }
      canvasCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      canvasCtx.drawImage(layerEl, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      layer.dispose();

      return new Promise((resolve) => {
        out.toBlob((blob) => resolve(blob), "image/png");
      });
    },
    [],
  );

  const renderViewBlob = useCallback(
    async (mockupView: MockupView): Promise<Blob | null> =>
      renderViewBlobFor(mockupView, {
        config: templateConfigRef.current,
        productType: productTypeRef.current,
        colorHex: colorHexRef.current,
        snapshots: viewSnapshots.current,
      }),
    [renderViewBlobFor],
  );

  const renderRawViewBlob = useCallback(
    async (mockupView: MockupView): Promise<Blob | null> =>
      renderRawViewBlobFor(mockupView, {
        config: templateConfigRef.current,
        productType: productTypeRef.current,
        colorHex: colorHexRef.current,
        snapshots: viewSnapshots.current,
      }),
    [renderRawViewBlobFor],
  );

    useEffect(() => {
      const mount = mountRef.current;
      if (!mount || fabricRef.current) return;

      const gen = ++canvasGenRef.current;
      const canvasEl = document.createElement("canvas");
      canvasEl.width = CANVAS_WIDTH;
      canvasEl.height = CANVAS_HEIGHT;
      canvasEl.className = "block";
      mount.appendChild(canvasEl);

      const fc = new Canvas(canvasEl, {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        selection: true,
        preserveObjectStacking: true,
        backgroundColor: MOCKUP_STAGE_BG,
        allowTouchScrolling: false,
        stopContextMenu: true,
      });
      fabricRef.current = fc;

      const onObjectAdjust = (e: { target?: FabricObject }) => {
        const obj = e.target;
        if (obj) constrainObjectToPrintArea(obj, currentPrintArea());
        syncTransform();
        notifyDesign();
      };
      fc.on("object:moving", () => {
        setShowPrintBounds(true);
        onObjectAdjust({ target: fc.getActiveObject() ?? undefined });
      });
      fc.on("object:scaling", () => {
        setShowPrintBounds(true);
        onObjectAdjust({ target: fc.getActiveObject() ?? undefined });
      });
      fc.on("object:rotating", () => {
        setShowPrintBounds(true);
        onObjectAdjust({ target: fc.getActiveObject() ?? undefined });
      });
      fc.on("object:modified", (e) => {
        setShowPrintBounds(false);
        onObjectAdjust(e);
      });
      fc.on("mouse:up", () => setShowPrintBounds(false));
      fc.on("selection:cleared", () => setShowPrintBounds(false));
      fc.on("object:added", notifyDesign);
      fc.on("object:removed", notifyDesign);
      fc.on("selection:created", notifySelection);
      fc.on("selection:updated", notifySelection);
      fc.on("selection:cleared", () => {
        onTextSelectionChangeRef.current?.(null);
        onSelectionChangeRef.current?.(null);
      });

      const onResize = () => {
        if (fabricRef.current === fc && isFabricCanvasLive(fc)) recalcCanvas(fc);
      };
      window.addEventListener("resize", onResize);

      void applyMockupBackground(fc, canvasViewRef.current).then(() => {
        if (canvasGenRef.current !== gen || fabricRef.current !== fc) return;
        readyRef.current = true;
        applyZoom(fc, zoomRef.current, hostRef.current);
        onReadyRef.current?.();
      });

      return () => {
        window.removeEventListener("resize", onResize);
        canvasGenRef.current += 1;
        readyRef.current = false;
        fabricRef.current = null;
        try {
          fc.dispose();
        } catch {
          /* already disposed */
        }
        mount.replaceChildren();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      const fc = fabricRef.current;
      if (!fc || !readyRef.current || !isFabricCanvasLive(fc)) return;
      applyZoom(fc, zoom, hostRef.current);
    }, [zoom]);

    useEffect(() => {
      const fc = fabricRef.current;
      if (!fc || !readyRef.current) return;
      if (prevColorHexRef.current === colorHex) return;
      prevColorHexRef.current = colorHex;
      void applyMockupBackground(fc, canvasViewRef.current).then(() => {
        if (fabricRef.current === fc && isFabricCanvasLive(fc)) applyPrintBlendToObjects(fc);
      });
    }, [applyMockupBackground, applyPrintBlendToObjects, colorHex]);

    useEffect(() => {
      const fc = fabricRef.current;
      if (!fc || !readyRef.current) return;
      void applyMockupBackground(fc, canvasViewRef.current).then(() => {
        if (fabricRef.current === fc && isFabricCanvasLive(fc)) applyPrintBlendToObjects(fc);
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [templateConfig]);

    useEffect(() => {
      if (view !== canvasViewRef.current) void switchView(view);
    }, [view, switchView]);

    useImperativeHandle(ref, () => ({
      isReady: () => readyRef.current && fabricRef.current != null,
      getView: () => canvasViewRef.current,

      async switchToView(v: MockupView) {
        await switchView(v);
      },

      async addImageFromUrl(url: string) {
        const fc = fabricRef.current;
        if (!fc || !readyRef.current) throw new Error("Canvas not ready");
        const el = await loadCorsSafeImage(url);
        const img = new FabricImage(el);
        const n = designCount(fc);
        const area = currentPrintArea();
        img.set(objectPlacement(area, (n % 5) * 24));
        img.scaleToWidth(area.width * 0.85);
        applyFabricPrintBlend(img, colorHexRef.current);
        img.setCoords();
        fc.add(img);
        fc.setActiveObject(img);
        recalcCanvas(fc);
        syncTransform();
        notifyDesign();
      },

      addText(text = "متن شما", style?: Partial<TextStyle>) {
        const fc = fabricRef.current;
        if (!fc || !readyRef.current) return;
        const s = { ...defaultTextStyleRef.current, ...style };
        const n = designCount(fc);
        const area = currentPrintArea();
        const t = new IText(text, {
          ...objectPlacement(area, (n % 5) * 24),
          fontFamily: s.fontFamily,
          fontSize: s.fontSize,
          fill: s.fill,
          fontWeight: s.fontWeight,
        });
        applyFabricPrintBlend(t, colorHexRef.current);
        fc.add(t);
        fc.setActiveObject(t);
        recalcCanvas(fc);
        syncTransform();
        notifyDesign();
        notifySelection();
      },

      addEmojiArt(emoji: string) {
        const fc = fabricRef.current;
        if (!fc || !readyRef.current) return;
        const n = designCount(fc);
        const area = currentPrintArea();
        const t = new IText(emoji, { ...objectPlacement(area, (n % 5) * 24), fontSize: 72 });
        applyFabricPrintBlend(t, colorHexRef.current);
        fc.add(t);
        fc.setActiveObject(t);
        fc.requestRenderAll();
        notifyDesign();
      },

      updateActiveText(style: Partial<TextStyle>) {
        const fc = fabricRef.current;
        const obj = fc?.getActiveObject();
        if (!fc || !isTextObject(obj)) return;
        if (style.fontFamily != null) obj.set("fontFamily", style.fontFamily);
        if (style.fontSize != null) obj.set("fontSize", style.fontSize);
        if (style.fill != null) obj.set("fill", style.fill);
        if (style.fontWeight != null) obj.set("fontWeight", style.fontWeight);
        obj.setCoords();
        fc.requestRenderAll();
        notifySelection();
      },

      setActiveTextContent(text: string) {
        const fc = fabricRef.current;
        const obj = fc?.getActiveObject();
        if (!fc || !isTextObject(obj)) return;
        obj.set("text", text);
        obj.setCoords();
        fc.requestRenderAll();
      },

      getActiveTextStyle() {
        const obj = fabricRef.current?.getActiveObject();
        return isTextObject(obj) ? textStyleFromObject(obj) : null;
      },

      isActiveImage() {
        return isImageObject(fabricRef.current?.getActiveObject());
      },

      async exportActiveImageBlob() {
        const obj = fabricRef.current?.getActiveObject();
        if (!isImageObject(obj)) return null;

        // منبع اصلی (data URL / blob) — نه اسکرین‌شات کم‌رزولوشن بوم
        const src = fabricImageSrc(obj);
        if (src) {
          try {
            const res = await fetch(normalizeCanvasImageSrc(src));
            if (res.ok) return res.blob();
          } catch {
            /* fallback */
          }
        }

        const naturalW = obj.width ?? 1;
        const displayW = naturalW * (obj.scaleX ?? 1);
        const multiplier = Math.min(4, Math.max(2, naturalW / Math.max(displayW, 1)));
        const el = obj.toCanvasElement({ multiplier });
        return await new Promise<Blob | null>((resolve) => {
          el.toBlob((blob) => resolve(blob), "image/png");
        });
      },

      async replaceActiveImageFromUrl(url: string) {
        const fc = fabricRef.current;
        const obj = fc?.getActiveObject();
        if (!fc || !isImageObject(obj)) return false;

        const displayW = (obj.width ?? 0) * (obj.scaleX ?? 1);
        const displayH = (obj.height ?? 0) * (obj.scaleY ?? 1);

        const el = await loadCorsSafeImage(url);
        obj.setElement(el);
        obj.set({ dirty: true });

        if (obj.width && obj.height && displayW > 0 && displayH > 0) {
          const scaleX = displayW / obj.width;
          const scaleY = displayH / obj.height;
          obj.set({ scaleX, scaleY });
        }

        obj.setCoords();
        applyFabricPrintBlend(obj, colorHexRef.current);
        fc.requestRenderAll();
        notifyDesign();
        return true;
      },

      deleteActiveObject() {
        const fc = fabricRef.current;
        const obj = fc?.getActiveObject();
        if (!fc || !obj) return false;
        fc.remove(obj);
        fc.discardActiveObject();
        fc.requestRenderAll();
        notifyDesign();
        return true;
      },

      async duplicateActiveObject() {
        const fc = fabricRef.current;
        const obj = fc?.getActiveObject();
        if (!fc || !obj) return;
        const clone = await obj.clone();
        clone.set({
          left: (obj.left ?? 0) + 24,
          top: (obj.top ?? 0) + 24,
        });
        clone.setCoords();
        if (clone.type === "image") {
          await refreshFabricImageSources([clone as FabricImage | IText]);
        }
        fc.add(clone);
        fc.setActiveObject(clone);
        recalcCanvas(fc);
        notifyDesign();
      },

      flipActiveObject() {
        const fc = fabricRef.current;
        const obj = fc?.getActiveObject();
        if (!fc || !obj) return;
        obj.set("flipX", !obj.flipX);
        obj.setCoords();
        fc.requestRenderAll();
      },

      centerActiveObject() {
        const fc = fabricRef.current;
        const obj = fc?.getActiveObject();
        if (!fc || !obj) return;
        const area = currentPrintArea();
        obj.set({
          originX: "center",
          originY: "center",
          left: area.centerX,
          top: area.centerY,
        });
        obj.setCoords();
        fc.requestRenderAll();
        syncTransform();
      },

      saveDraft() {
        saveViewSnapshot();
        const out: DesignDraft = {};
        for (const s of sidesRef.current) {
          out[s.id] = viewSnapshots.current[s.id] ?? [];
        }
        return out;
      },

      async loadDraft(draft: DesignDraft) {
        const fc = fabricRef.current;
        if (!fc || !readyRef.current) return;
        const legacy = draft as DesignDraft & { front?: object[]; back?: object[] };
        for (const s of sidesRef.current) {
          viewSnapshots.current[s.id] =
            legacy[s.id] ?? legacy.front ?? legacy.back ?? [];
        }
        await applyMockupBackground(fc, canvasViewRef.current);
        await restoreDesignObjects(fc, canvasViewRef.current);
      },

      async exportDraftForTemplate(
        targetTemplate: ProductTemplate,
        draft: DesignDraft,
        colorHex: string,
      ) {
        const targetSides = resolveTemplateSides(targetTemplate.config_json, targetTemplate.slug);
        const exportCtx: ExportContext = {
          config: targetTemplate.config_json,
          productType: targetTemplate.slug,
          colorHex,
          snapshots: Object.fromEntries(
            targetSides.map((s) => [s.id, (draft[s.id] as object[]) ?? []]),
          ),
        };

        const mockupBlobs: Record<string, Blob | null> = {};
        const rawBlobs: Record<string, Blob | null> = {};
        for (const s of targetSides) {
          mockupBlobs[s.id] = await renderViewBlobFor(s.id, exportCtx);
          rawBlobs[s.id] = await renderRawViewBlobFor(s.id, exportCtx);
        }

        return { mockupBlobs, rawBlobs };
      },

      async exportViewBlob(v: MockupView) {
        saveViewSnapshot();
        return renderViewBlob(v);
      },

      async exportAllViewBlobs() {
        saveViewSnapshot();
        const out: Record<string, Blob | null> = {};
        for (const s of sidesRef.current) {
          out[s.id] = await renderViewBlob(s.id);
        }
        return out;
      },

      async exportAllRawViewBlobs() {
        saveViewSnapshot();
        const out: Record<string, Blob | null> = {};
        for (const s of sidesRef.current) {
          out[s.id] = await renderRawViewBlob(s.id);
        }
        return out;
      },

      async exportDesignBlob() {
        const fc = fabricRef.current;
        if (!fc) return null;
        saveViewSnapshot();
        const off = document.createElement("canvas");
        const temp = new StaticCanvas(off, {
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
        });
        temp.backgroundColor = MOCKUP_STAGE_BG;
        if (fc.backgroundImage) {
          temp.backgroundImage = await fc.backgroundImage.clone();
        }
        const objs = fc.getObjects();
        if (!objs.length) {
          temp.dispose();
          return null;
        }
        for (const o of objs) temp.add(await o.clone());
        temp.renderAll();
        const dataUrl = temp.toDataURL({ format: "png", multiplier: 2 });
        temp.dispose();
        return (await fetch(dataUrl)).blob();
      },

      hasDesignObjects() {
        const fc = fabricRef.current;
        if (!fc) return false;
        if (designCount(fc) > 0) return true;
        return sidesRef.current.some((s) => (viewSnapshots.current[s.id]?.length ?? 0) > 0);
      },
    }));

    const displayW = Math.round(CANVAS_WIDTH * zoom);
    const displayH = Math.round(CANVAS_HEIGHT * zoom);
    const activeSide = sides.find((s) => s.id === view) ?? sides[0];
    const guide = activeSide?.print_area;

    return (
      <div
        ref={hostRef}
        className="design-lab-fabric-host coralay-fabric-preview relative"
        style={{
          width: displayW,
          height: displayH,
          touchAction: "none",
          flexShrink: 0,
        }}
      >
        <div ref={mountRef} className="h-full w-full" />
        {guide ? (
          <div
            className={`design-lab-print-area-guide pointer-events-none absolute z-10${showPrintBounds ? "" : " hidden"}`}
            style={{
              left: `${guide.x * 100}%`,
              top: `${guide.y * 100}%`,
              width: `${guide.width * 100}%`,
              height: `${guide.height * 100}%`,
            }}
            aria-hidden={!showPrintBounds}
          />
        ) : null}
      </div>
    );
  }),
);
