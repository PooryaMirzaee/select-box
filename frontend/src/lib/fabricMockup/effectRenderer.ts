/** استخراج transform برای API سبد */
export function fabricObjectToTransform(
  obj: {
    left?: number;
    top?: number;
    scaleX?: number;
    scaleY?: number;
    angle?: number;
  },
  canvasWidth = 546,
  canvasHeight = 640,
) {
  const scale = ((obj.scaleX ?? 1) + (obj.scaleY ?? 1)) / 2;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight * 0.38;
  return {
    x: Math.round((obj.left ?? centerX) - centerX),
    y: Math.round((obj.top ?? centerY) - centerY),
    scale: Math.round(scale * 100) / 100,
    rotation: Math.round(obj.angle ?? 0),
  };
}
