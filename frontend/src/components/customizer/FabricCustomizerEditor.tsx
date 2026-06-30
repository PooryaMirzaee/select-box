"use client";

import { Canvas, FabricImage } from "fabric";
import { useCallback, useEffect, useRef, useState } from "react";

import type { CustomizationTransform } from "@/lib/customizer";
import {
  applyFabricPrintBlend,
  buildTshirtBackground,
} from "@/lib/fabricMockup/basicMockup";
import { fabricObjectToTransform } from "@/lib/fabricMockup/effectRenderer";
import { cn } from "@/lib/utils";

/** اندازه canvas = اندازه نمایش (بدون CSS scale — drag درست کار می‌کند) */
const CANVAS_SIZE = 440;

const MUG_BG = "/mockups/mug/base.jpg";

type Props = {
  productType: string;
  colorHex: string;
  artworkUrl: string | null;
  onTransformChange: (t: CustomizationTransform) => void;
  className?: string;
};

export function FabricCustomizerEditor({
  productType,
  colorHex,
  artworkUrl,
  onTransformChange,
  className,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const bgRef = useRef<FabricImage | null>(null);
  const designRef = useRef<FabricImage | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const syncTransform = useCallback(() => {
    const obj = designRef.current;
    if (obj) onTransformChange(fabricObjectToTransform(obj, CANVAS_SIZE));
  }, [onTransformChange]);

  const loadBackground = useCallback(
    async (fc: Canvas) => {
      if (bgRef.current) fc.remove(bgRef.current);

      let bg: FabricImage;
      if (productType === "mug") {
        bg = await FabricImage.fromURL(MUG_BG);
        bg.set({
          selectable: false,
          evented: false,
          originX: "left",
          originY: "top",
          left: 0,
          top: 0,
        });
        if (bg.width) bg.scaleToWidth(CANVAS_SIZE);
      } else {
        const canvas = await buildTshirtBackground(colorHex, CANVAS_SIZE);
        bg = new FabricImage(canvas);
        bg.set({
          selectable: false,
          evented: false,
          originX: "left",
          originY: "top",
          left: 0,
          top: 0,
          scaleX: 1,
          scaleY: 1,
        });
      }

      bgRef.current = bg;
      fc.add(bg);
      fc.sendObjectToBack(bg);
      if (designRef.current) {
        applyFabricPrintBlend(designRef.current, colorHex);
        fc.bringObjectToFront(designRef.current);
      }
      fc.renderAll();
    },
    [colorHex, productType],
  );

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || fabricRef.current) return;

    const fc = new Canvas(el, {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      selection: true,
      preserveObjectStacking: true,
      backgroundColor: "#eceae6",
      allowTouchScrolling: false,
      stopContextMenu: true,
    });
    fabricRef.current = fc;

    fc.on("object:modified", syncTransform);
    fc.on("object:moving", syncTransform);
    fc.on("object:scaling", syncTransform);
    fc.on("object:rotating", syncTransform);

    void loadBackground(fc)
      .then(() => setReady(true))
      .catch(() => setLoadError("بارگذاری تیشرت ناموفق"));

    return () => {
      fc.dispose();
      fabricRef.current = null;
      bgRef.current = null;
      designRef.current = null;
      setReady(false);
    };
  }, [loadBackground, syncTransform]);

  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc || !ready) return;
    void loadBackground(fc).catch(() => setLoadError("بارگذاری تیشرت ناموفق"));
  }, [colorHex, productType, ready, loadBackground]);

  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc || !ready) return;

    if (!artworkUrl) {
      if (designRef.current) {
        fc.remove(designRef.current);
        designRef.current = null;
        fc.discardActiveObject();
        fc.renderAll();
      }
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setLoadError(null);

    FabricImage.fromURL(artworkUrl, { crossOrigin: "anonymous" })
      .then((img) => {
        if (cancelled || !fabricRef.current) return;

        if (designRef.current) fc.remove(designRef.current);

        const chestY = productType === "mug" ? CANVAS_SIZE * 0.42 : CANVAS_SIZE * 0.36;
        img.set({
          originX: "center",
          originY: "center",
          left: CANVAS_SIZE / 2,
          top: chestY,
          cornerStyle: "circle",
          cornerColor: "#c45c26",
          cornerSize: 12,
          borderColor: "#c45c26",
          borderScaleFactor: 2,
          transparentCorners: false,
          hasControls: true,
          hasBorders: true,
          lockScalingFlip: true,
        });
        img.scaleToWidth(CANVAS_SIZE * (productType === "mug" ? 0.36 : 0.28));

        if (productType !== "mug") applyFabricPrintBlend(img, colorHex);

        designRef.current = img;
        fc.add(img);
        fc.setActiveObject(img);
        fc.bringObjectToFront(img);
        fc.renderAll();
        syncTransform();
      })
      .catch(() => {
        if (!cancelled) setLoadError("بارگذاری طرح ناموفق");
      });

    return () => {
      cancelled = true;
    };
  }, [artworkUrl, ready, productType, syncTransform]);

  useEffect(() => {
    const fc = fabricRef.current;
    const design = designRef.current;
    if (!fc || !design || !ready || productType === "mug") return;
    applyFabricPrintBlend(design, colorHex);
    fc.renderAll();
  }, [colorHex, ready, productType]);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        ref={wrapRef}
        className="coralay-fabric-preview relative overflow-hidden rounded-2xl bg-[var(--bg-elevated)] shadow-inner"
        style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="block"
          style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
        />
        {!artworkUrl ? (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-6">
            <span className="rounded-lg bg-black/55 px-4 py-2 text-sm text-white">
              تصویر طرح را آپلود کنید
            </span>
          </div>
        ) : null}
        {loadError ? (
          <div className="pointer-events-none absolute inset-x-0 top-3 text-center">
            <span className="rounded-lg bg-red-600/90 px-3 py-1 text-xs text-white">{loadError}</span>
          </div>
        ) : null}
      </div>

      {artworkUrl ? (
        <p className="mt-3 text-center text-xs text-muted">
          طرح را بکشید · گوشه‌ها برای اندازه · بالا برای چرخش
        </p>
      ) : null}
    </div>
  );
}
