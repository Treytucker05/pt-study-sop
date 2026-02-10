import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useQuery } from "@tanstack/react-query";
import { Tldraw, createTLStore, createShapeId } from "tldraw";
import "tldraw/tldraw.css";
import { api } from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface MindMapNode {
  id: string;
  name: string;
  type: "course" | "module" | "lo";
  x?: number;
  y?: number;
}

interface MindMapLink {
  source: string;
  target: string;
}

const TYPE_COLORS: Record<string, string> = {
  course: "#22d3ee",
  module: "#facc15",
  lo: "#4ade80",
};

const TYPE_BG: Record<string, string> = {
  course: "rgba(34,211,238,0.15)",
  module: "rgba(250,204,21,0.12)",
  lo: "rgba(74,222,128,0.08)",
};

const NODE_W = 200;
const NODE_H = 40;
const LEVEL_STEP = 260;
const ROW_STEP = 52;

function seedMindMapToTldraw(
  editor: { createShapes: (shapes: unknown[]) => void; getCurrentPageShapes: () => { id: string }[] },
  data: { nodes: MindMapNode[]; links: MindMapLink[] }
) {
  const { nodes, links } = data;
  if (nodes.length === 0) return;

  const byLevel = { course: 0, module: 1, lo: 2 } as const;
  const levelIndex = { course: 0, module: 0, lo: 0 };
  const positions = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    const level = byLevel[n.type];
    const idx = levelIndex[n.type]++;
    const x = level * LEVEL_STEP + 40;
    const y = idx * ROW_STEP + 40;
    positions.set(n.id, { x, y });
  }

  const prevMindIds = editor.getCurrentPageShapes().filter((s) => String(s.id).includes("mind-")).map((s) => s.id);
  if (prevMindIds.length > 0) {
    (editor as { deleteShapes: (ids: unknown[]) => void }).deleteShapes(prevMindIds);
  }
  const shapeIds = nodes.map((n) => createShapeId(`mind-${n.id}`));
  editor.createShapes(
    nodes.map((n, i) => {
      const pos = positions.get(n.id)!;
      return {
        id: shapeIds[i],
        type: "note",
        x: pos.x,
        y: pos.y,
        props: { text: n.name },
      };
    })
  );

  const linkShapes: { id: string; type: string; x: number; y: number; props: { start: { x: number; y: number }; end: { x: number; y: number } } }[] = [];
  links.forEach((link, i) => {
    const from = positions.get(link.source);
    const to = positions.get(link.target);
    if (!from || !to) return;
    const sx = from.x + NODE_W / 2;
    const sy = from.y + NODE_H / 2;
    const ex = to.x + NODE_W / 2;
    const ey = to.y + NODE_H / 2;
    const minX = Math.min(sx, ex) - 20;
    const minY = Math.min(sy, ey) - 20;
    linkShapes.push({
      id: createShapeId(`mind-arrow-${i}`) as string,
      type: "arrow",
      x: minX,
      y: minY,
      props: {
        start: { x: sx - minX, y: sy - minY },
        end: { x: ex - minX, y: ey - minY },
      },
    });
  });
  if (linkShapes.length > 0) {
    editor.createShapes(linkShapes as any);
  }
}

export function MindMapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const didInitRef = useRef(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<Set<number>>(new Set());
  const [selectedModules, setSelectedModules] = useState<Set<number>>(new Set());
  const [includeLOs, setIncludeLOs] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"force" | "whiteboard">("force");
  const whiteboardStore = useMemo(() => createTLStore(), []);
  const whiteboardEditorRef = useRef<any>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => api.courses.getActive(),
  });

  const courseIds = courses.map((c: any) => c.id).sort();

  const { data: allModules = [] } = useQuery({
    queryKey: ["modules", "all", courseIds],
    queryFn: async () => {
      const results = await Promise.all(
        courses.map((c: any) => api.modules.getByCourse(c.id))
      );
      return results.flat();
    },
    enabled: courses.length > 0,
  });

  const { data: allLOs = [] } = useQuery({
    queryKey: ["learningObjectives", "all", courseIds, includeLOs],
    queryFn: async () => {
      const results = await Promise.all(
        courses.map((c: any) => api.learningObjectives.getByCourse(c.id))
      );
      return results.flat();
    },
    enabled: courses.length > 0 && includeLOs,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setDimensions({ width: Math.max(1, Math.floor(rect.width) - 2), height: Math.max(1, Math.floor(rect.height) - 2) });
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (courses.length > 0 && !didInitRef.current) {
      didInitRef.current = true;
      setSelectedCourses(new Set(courses.map((c: any) => c.id)));
    }
  }, [courses]);

  const graphData = useMemo(() => {
    const nodes: MindMapNode[] = [];
    const links: MindMapLink[] = [];

    const modulesByCourse = new Map<number, any[]>();
    for (const m of allModules) {
      const list = modulesByCourse.get(m.courseId) ?? [];
      list.push(m);
      modulesByCourse.set(m.courseId, list);
    }
    const losByModule = new Map<number, any[]>();
    for (const lo of allLOs) {
      if (lo.moduleId == null) continue;
      const list = losByModule.get(lo.moduleId) ?? [];
      list.push(lo);
      losByModule.set(lo.moduleId, list);
    }

    for (const course of courses) {
      if (!selectedCourses.has(course.id)) continue;
      const courseId = `course-${course.id}`;
      nodes.push({ id: courseId, name: course.name, type: "course" });

      const courseModules = modulesByCourse.get(course.id) ?? [];
      for (const mod of courseModules) {
        if (selectedModules.size > 0 && !selectedModules.has(mod.id)) continue;
        const modId = `module-${mod.id}`;
        nodes.push({ id: modId, name: mod.name, type: "module" });
        links.push({ source: courseId, target: modId });

        if (includeLOs) {
          const modLOs = losByModule.get(mod.id) ?? [];
          for (const lo of modLOs) {
            const loId = `lo-${lo.id}`;
            nodes.push({ id: loId, name: `${lo.loCode}: ${lo.title}`, type: "lo" });
            links.push({ source: modId, target: loId });
          }
        }
      }
    }

    return { nodes, links };
  }, [courses, allModules, allLOs, selectedCourses, selectedModules, includeLOs]);

  const toggleCourse = (id: number) => {
    setSelectedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleModule = (id: number) => {
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Draw labeled rounded-rect boxes instead of circles
  const nodeCanvasObject = useCallback(
    (node: MindMapNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const color = TYPE_COLORS[node.type] || "#6366f1";
      const bg = TYPE_BG[node.type] || "rgba(99,102,241,0.1)";
      const isHovered = hoveredNode === node.id;
      const x = node.x || 0;
      const y = node.y || 0;

      // Font sizing by type
      const baseFontSize = node.type === "course" ? 14 : node.type === "module" ? 11 : 9;
      const fontSize = Math.max(baseFontSize / globalScale, 2);
      ctx.font = `${node.type === "course" ? "bold " : ""}${fontSize}px monospace`;

      // Truncate label
      const maxChars = node.type === "lo" ? 50 : 35;
      const label = node.name.length > maxChars ? node.name.slice(0, maxChars) + "..." : node.name;
      const textWidth = ctx.measureText(label).width;

      const padX = 8 / globalScale;
      const padY = 5 / globalScale;
      const boxW = textWidth + padX * 2;
      const boxH = fontSize + padY * 2;
      const radius = 4 / globalScale;

      // Rounded rect background
      ctx.beginPath();
      ctx.roundRect(x - boxW / 2, y - boxH / 2, boxW, boxH, radius);
      ctx.fillStyle = isHovered ? color : bg;
      ctx.fill();
      ctx.strokeStyle = isHovered ? "#ffffff" : color;
      ctx.lineWidth = (node.type === "course" ? 2 : 1) / globalScale;
      ctx.stroke();

      // Label text
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = isHovered ? "#000000" : color;
      ctx.fillText(label, x, y);
    },
    [hoveredNode]
  );

  // Hit area for hover/click
  const nodePointerAreaPaint = useCallback(
    (node: MindMapNode, color: string, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x || 0;
      const y = node.y || 0;
      const size = node.type === "course" ? 60 : node.type === "module" ? 45 : 30;
      const s = size / globalScale;
      ctx.fillStyle = color;
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    },
    []
  );

  // Curved links for organic feel
  const linkCanvasObject = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const src = link.source;
      const tgt = link.target;
      if (!src || !tgt) return;
      const sx = src.x || 0;
      const sy = src.y || 0;
      const tx = tgt.x || 0;
      const ty = tgt.y || 0;

      // Quadratic curve with midpoint offset
      const mx = (sx + tx) / 2;
      const my = (sy + ty) / 2;
      const dx = tx - sx;
      const dy = ty - sy;
      const cpx = mx - dy * 0.15;
      const cpy = my + dx * 0.15;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(cpx, cpy, tx, ty);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
      ctx.lineWidth = Math.max(1.5 / globalScale, 0.3);
      ctx.stroke();
    },
    []
  );

  const activeCourseModules = allModules.filter((m: any) => selectedCourses.has(m.courseId));

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-[160px] shrink-0 border-r border-secondary/30 bg-black/60">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-4">
            <div>
              <div className="font-arcade text-[10px] text-primary mb-2">COURSES</div>
              {courses.map((c: any) => (
                <label key={c.id} className="flex items-center gap-2 py-1 cursor-pointer">
                  <Checkbox
                    checked={selectedCourses.has(c.id)}
                    onCheckedChange={() => toggleCourse(c.id)}
                    className="border-cyan-500 data-[state=checked]:bg-cyan-500"
                  />
                  <span className="font-terminal text-xs text-cyan-300">{c.name}</span>
                </label>
              ))}
            </div>

            {activeCourseModules.length > 0 && (
              <div>
                <div className="font-arcade text-[10px] text-yellow-400 mb-2">MODULES</div>
                <label className="flex items-center gap-2 py-1 cursor-pointer mb-1">
                  <Checkbox
                    checked={selectedModules.size === 0}
                    onCheckedChange={() => setSelectedModules(new Set())}
                    className="border-yellow-500 data-[state=checked]:bg-yellow-500"
                  />
                  <span className="font-terminal text-xs text-yellow-200">All Modules</span>
                </label>
                {activeCourseModules.map((m: any) => (
                  <label key={m.id} className="flex items-center gap-2 py-0.5 cursor-pointer">
                    <Checkbox
                      checked={selectedModules.size === 0 || selectedModules.has(m.id)}
                      onCheckedChange={() => toggleModule(m.id)}
                      className="border-yellow-500 data-[state=checked]:bg-yellow-500"
                    />
                    <span className="font-terminal text-[10px] text-yellow-100 truncate">{m.name}</span>
                  </label>
                ))}
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={includeLOs}
                  onCheckedChange={(checked) => setIncludeLOs(!!checked)}
                  className="border-green-500 data-[state=checked]:bg-green-500"
                />
                <span className="font-terminal text-xs text-green-300">Show Learning Objectives</span>
              </label>
            </div>

            {/* Legend */}
            <div className="pt-2 border-t border-secondary/30 space-y-1">
              <div className="font-arcade text-[10px] text-muted-foreground mb-1">LEGEND</div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm border-2 border-cyan-400 bg-cyan-400/15" />
                <span className="font-terminal text-[10px] text-cyan-300">Course</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm border border-yellow-400 bg-yellow-400/12" />
                <span className="font-terminal text-[10px] text-yellow-300">Module</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm border border-green-400 bg-green-400/8" />
                <span className="font-terminal text-[10px] text-green-300">Learning Objective</span>
              </div>
            </div>

            <div className="pt-2 border-t border-secondary/30 font-terminal text-[10px] text-muted-foreground">
              <div>Nodes: {graphData.nodes.length}</div>
              <div>Links: {graphData.links.length}</div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Mind Map Canvas */}
      <div className="flex-1 flex flex-col min-h-0 bg-black/80">
        <div className="flex items-center gap-2 px-2 py-1.5 border-b border-secondary/30 shrink-0 bg-black/40">
          <span className="font-arcade text-[10px] text-muted-foreground uppercase mr-1">View</span>
          <button
            type="button"
            onClick={() => setViewMode("force")}
            className={cn(
              "tab-sub-item text-xs",
              viewMode === "force" && "active"
            )}
          >
            Force graph
          </button>
          <button
            type="button"
            onClick={() => setViewMode("whiteboard")}
            className={cn(
              "tab-sub-item text-xs",
              viewMode === "whiteboard" && "active"
            )}
          >
            Whiteboard
          </button>
          {viewMode === "whiteboard" && (
            <button
              type="button"
              onClick={() => {
                const ed = whiteboardEditorRef.current;
                if (ed && graphData.nodes.length > 0) seedMindMapToTldraw(ed, graphData);
              }}
              className="tab-sub-item text-xs ml-2"
              disabled={graphData.nodes.length === 0}
            >
              Seed from selection
            </button>
          )}
        </div>
        <div ref={containerRef} className="flex-1 relative overflow-hidden min-h-0">
          {viewMode === "force" && (
            <>
              {dimensions && graphData.nodes.length > 0 && (
                <ForceGraph2D
                  ref={graphRef}
                  graphData={graphData}
                  width={dimensions.width}
                  height={dimensions.height}
                  dagMode="lr"
                  dagLevelDistance={120}
                  nodeCanvasObject={nodeCanvasObject}
                  nodePointerAreaPaint={nodePointerAreaPaint}
                  linkCanvasObject={linkCanvasObject}
                  onNodeHover={(node: MindMapNode | null) => setHoveredNode(node?.id ?? null)}
                  linkColor={() => "transparent"}
                  linkWidth={0}
                  backgroundColor="transparent"
                  cooldownTicks={100}
                  d3AlphaDecay={0.025}
                  d3VelocityDecay={0.35}
                />
              )}
              {graphData.nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center font-terminal text-xs text-muted-foreground">
                  Select courses to build mind map
                </div>
              )}
            </>
          )}
          {viewMode === "whiteboard" && (
            <div className="absolute inset-0">
              <Tldraw
                store={whiteboardStore}
                onMount={(editor) => {
                  whiteboardEditorRef.current = editor;
                  editor.user.updateUserPreferences({ colorScheme: "dark" });
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
