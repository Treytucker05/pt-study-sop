import { useCallback, useEffect, useRef, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
} from "@xyflow/react";

function getStepPath(props: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: any;
  targetPosition: any;
}) {
  // "step" is smoothstep with borderRadius=0
  return getSmoothStepPath({ ...props, borderRadius: 0 });
}

type PathGetter = (props: any) => [string, number, number];

const PATH_GETTERS: Record<string, PathGetter> = {
  bezier: getBezierPath,
  smoothstep: getSmoothStepPath,
  straight: getStraightPath,
  step: getStepPath,
};

export function StructuredEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
  selected,
}: EdgeProps) {
  const edgeType = (data as { edgeType?: string })?.edgeType ?? "smoothstep";
  const label = (data as { label?: string })?.label ?? "";

  const getter = PATH_GETTERS[edgeType] ?? getSmoothStepPath;
  const [edgePath, labelX, labelY] = getter({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setEditValue(label);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing, label]);

  const commitEdit = useCallback(() => {
    setEditing(false);
    const trimmed = editValue.trim();
    window.dispatchEvent(
      new CustomEvent("structured:edge-label", {
        detail: { edgeId: id, label: trimmed },
      })
    );
  }, [editValue, id]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        commitEdit();
      } else if (e.key === "Escape") {
        setEditing(false);
      }
    },
    [commitEdit]
  );

  return (
    <>
      <BaseEdge path={edgePath} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          {editing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              className="bg-black border border-primary text-primary text-[10px] font-terminal text-center px-1 py-0.5 outline-none min-w-[60px]"
              autoFocus
            />
          ) : label ? (
            <span
              onDoubleClick={() => setEditing(true)}
              className="bg-black/90 border border-primary/40 text-primary/80 text-[10px] font-terminal px-1.5 py-0.5 cursor-pointer hover:border-primary hover:text-primary"
            >
              {label}
            </span>
          ) : selected ? (
            <button
              onClick={() => setEditing(true)}
              className="bg-black/80 border border-dashed border-primary/30 text-primary/40 text-[10px] font-terminal px-1.5 py-0.5 hover:border-primary/60 hover:text-primary/60"
            >
              + label
            </button>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
