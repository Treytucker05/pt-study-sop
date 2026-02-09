import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { api } from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

interface GraphNode {
  id: string;
  name: string;
  folder: string;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface VaultGraphViewProps {
  onNodeClick?: (noteName: string) => void;
}

const FOLDER_COLORS: Record<string, string> = {
  "": "#6366f1",
  "School": "#22d3ee",
  "Clinical": "#f472b6",
  "Research": "#a78bfa",
  "Personal": "#34d399",
};

function getFolderColor(folder: string): string {
  const top = folder.split("/")[0];
  return FOLDER_COLORS[top] || "#6366f1";
}

export function VaultGraphView({ onNodeClick }: VaultGraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const [rawGraphData, setRawGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [didInit, setDidInit] = useState(false);

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
    let cancelled = false;
    setLoading(true);
    api.obsidian.getGraph().then((data) => {
      if (cancelled) return;
      if (data.success) {
        setRawGraphData({ nodes: data.nodes, links: data.links });
      } else {
        setError("Failed to load graph data");
      }
      setLoading(false);
    }).catch(() => {
      if (!cancelled) {
        setError("Network error loading graph");
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Extract unique top-level folders
  const folders = useMemo(() => {
    const folderSet = new Set<string>();
    for (const node of rawGraphData.nodes) {
      const top = node.folder?.split("/")[0] || "(root)";
      folderSet.add(top);
    }
    return Array.from(folderSet).sort();
  }, [rawGraphData.nodes]);

  // Auto-select all folders on first data load
  useEffect(() => {
    if (folders.length > 0 && !didInit) {
      setDidInit(true);
      setSelectedFolders(new Set(folders));
    }
  }, [folders, didInit]);

  // Filter graph data by selected folders
  const graphData = useMemo(() => {
    if (selectedFolders.size === 0 || selectedFolders.size === folders.length) {
      return rawGraphData;
    }
    const visibleNodeIds = new Set<string>();
    const filteredNodes = rawGraphData.nodes.filter((n) => {
      const top = n.folder?.split("/")[0] || "(root)";
      const visible = selectedFolders.has(top);
      if (visible) visibleNodeIds.add(n.id);
      return visible;
    });
    const filteredLinks = rawGraphData.links.filter((l) => {
      const srcId = typeof l.source === "string" ? l.source : l.source.id;
      const tgtId = typeof l.target === "string" ? l.target : l.target.id;
      return visibleNodeIds.has(srcId) && visibleNodeIds.has(tgtId);
    });
    return { nodes: filteredNodes, links: filteredLinks };
  }, [rawGraphData, selectedFolders, folders.length]);

  const toggleFolder = (folder: string) => {
    setSelectedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  };

  const handleNodeClick = useCallback((node: GraphNode) => {
    onNodeClick?.(node.name);
  }, [onNodeClick]);

  const handleZoom = useCallback((val: number) => {
    const clamped = Math.max(0.1, Math.min(10, val));
    setZoomLevel(clamped);
    const fg = graphRef.current as any;
    if (fg?.zoom) {
      fg.zoom(clamped, 200);
    }
  }, []);

  const nodeCanvasObject = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name;
    const fontSize = Math.max(10 / globalScale, 2);
    const nodeR = Math.max(4, 3 + (graphData.links.filter(
      (l) => (typeof l.source === "string" ? l.source : l.source.id) === node.id ||
             (typeof l.target === "string" ? l.target : l.target.id) === node.id
    ).length * 0.5));

    const color = getFolderColor(node.folder);
    const isHovered = hoveredNode?.id === node.id;

    ctx.beginPath();
    ctx.arc(node.x || 0, node.y || 0, nodeR, 0, 2 * Math.PI);
    ctx.fillStyle = isHovered ? "#ffffff" : color;
    ctx.fill();

    if (isHovered || globalScale > 1.5) {
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(label, node.x || 0, (node.y || 0) + nodeR + 2);
    }
  }, [graphData.links, hoveredNode]);

  const ready = !loading && !error && dimensions;

  return (
    <div className="flex h-full">
      {/* Folder Filter Sidebar */}
      <div className="w-[180px] shrink-0 border-r border-secondary/30 bg-black/60">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-3">
            <div className="font-arcade text-[10px] text-primary mb-2">FOLDERS</div>
            <label className="flex items-center gap-2 py-1 cursor-pointer">
              <Checkbox
                checked={selectedFolders.size === folders.length}
                onCheckedChange={(checked) => {
                  setSelectedFolders(checked ? new Set(folders) : new Set());
                }}
                className="border-primary data-[state=checked]:bg-primary"
              />
              <span className="font-terminal text-xs text-primary">All Folders</span>
            </label>
            {folders.map((folder) => (
              <label key={folder} className="flex items-center gap-2 py-0.5 cursor-pointer">
                <Checkbox
                  checked={selectedFolders.has(folder)}
                  onCheckedChange={() => toggleFolder(folder)}
                  className="border-primary data-[state=checked]:bg-primary"
                />
                <span
                  className="font-terminal text-xs truncate"
                  style={{ color: getFolderColor(folder === "(root)" ? "" : folder) }}
                >
                  {folder}
                </span>
              </label>
            ))}

            {/* Legend */}
            <div className="pt-2 border-t border-secondary/30 space-y-1">
              <div className="font-arcade text-[10px] text-muted-foreground mb-1">COLORS</div>
              {Object.entries(FOLDER_COLORS).filter(([k]) => k).map(([name, color]) => (
                <div key={name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="font-terminal text-[10px]" style={{ color }}>{name}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-secondary/30 font-terminal text-[10px] text-muted-foreground">
              <div>Notes: {graphData.nodes.length}</div>
              <div>Links: {graphData.links.length}</div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Graph */}
      <div ref={containerRef} className="flex-1 relative bg-black/80 rounded border border-primary/30 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-primary font-terminal z-10">
            <div className="animate-pulse">SCANNING VAULT CONNECTIONS...</div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-red-400 font-terminal z-10">
            {error}
          </div>
        )}
        {ready && (
          <>
            <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  onClick={() => {
                    (graphRef.current as any)?.zoomToFit?.(400, 40);
                    setTimeout(() => {
                      const fg = graphRef.current as any;
                      if (fg?.zoom) setZoomLevel(fg.zoom());
                    }, 450);
                  }}
                  className="px-2 py-0.5 text-xs font-terminal bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 rounded-none"
                >
                  CENTER
                </button>
              </div>
              <div className="flex items-center gap-1.5 pointer-events-auto bg-black/70 border border-primary/30 rounded-none px-2 py-1">
                <button
                  onClick={() => handleZoom(zoomLevel / 1.3)}
                  className="text-primary hover:text-white font-mono text-sm w-5 h-5 flex items-center justify-center"
                >
                  -
                </button>
                <input
                  type="range"
                  min={-2.3}
                  max={2.3}
                  step={0.01}
                  value={Math.log(zoomLevel)}
                  onChange={(e) => handleZoom(Math.exp(parseFloat(e.target.value)))}
                  className="w-24 h-1 accent-primary cursor-pointer"
                />
                <button
                  onClick={() => handleZoom(zoomLevel * 1.3)}
                  className="text-primary hover:text-white font-mono text-sm w-5 h-5 flex items-center justify-center"
                >
                  +
                </button>
                <span className="text-[10px] font-terminal text-primary/50 w-8 text-right">
                  {Math.round(zoomLevel * 100)}%
                </span>
              </div>
            </div>
            <ForceGraph2D
              ref={graphRef as React.MutableRefObject<never>}
              graphData={graphData}
              width={dimensions.width}
              height={dimensions.height}
              nodeCanvasObject={nodeCanvasObject}
              nodePointerAreaPaint={(node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
                ctx.beginPath();
                ctx.arc(node.x || 0, node.y || 0, 6, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();
              }}
              onNodeClick={handleNodeClick}
              onNodeHover={(node: GraphNode | null) => setHoveredNode(node)}
              onZoom={({ k }: { k: number }) => setZoomLevel(k)}
              linkColor={() => "rgba(99, 102, 241, 0.15)"}
              linkWidth={0.5}
              backgroundColor="transparent"
              cooldownTicks={100}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
            />
          </>
        )}
      </div>
    </div>
  );
}
