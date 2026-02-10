import { useRef, useEffect, useCallback } from "react";

export interface DrawStroke {
  points: [number, number][];
  color: string;
  width: number;
}

interface MindMapDrawLayerProps {
  active: boolean;
  strokes: DrawStroke[];
  onStrokeAdd: (stroke: DrawStroke) => void;
  penColor?: string;
  penWidth?: number;
}

export function MindMapDrawLayer({
  active,
  strokes,
  onStrokeAdd,
  penColor = "#ef4444",
  penWidth = 2,
}: MindMapDrawLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<[number, number][]>([]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(stroke.points[0][0], stroke.points[0][1]);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i][0], stroke.points[i][1]);
      }
      ctx.stroke();
    }

    // Draw in-progress stroke
    const cur = currentStrokeRef.current;
    if (cur.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(cur[0][0], cur[0][1]);
      for (let i = 1; i < cur.length; i++) {
        ctx.lineTo(cur[i][0], cur[i][1]);
      }
      ctx.stroke();
    }
  }, [strokes, penColor, penWidth]);

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const obs = new ResizeObserver(() => {
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      redraw();
    });
    obs.observe(parent);
    return () => obs.disconnect();
  }, [redraw]);

  useEffect(() => { redraw(); }, [redraw]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!active) return;
    drawingRef.current = true;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    currentStrokeRef.current = [[e.clientX - rect.left, e.clientY - rect.top]];
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [active]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    currentStrokeRef.current.push([e.clientX - rect.left, e.clientY - rect.top]);
    redraw();
  }, [redraw]);

  const onPointerUp = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const pts = currentStrokeRef.current;
    if (pts.length >= 2) {
      onStrokeAdd({ points: [...pts], color: penColor, width: penWidth });
    }
    currentStrokeRef.current = [];
  }, [onStrokeAdd, penColor, penWidth]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{
        zIndex: active ? 10 : 0,
        pointerEvents: active ? "auto" : "none",
        cursor: active ? "crosshair" : "default",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  );
}
