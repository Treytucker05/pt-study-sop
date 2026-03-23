export interface Objective {
  id: number;
  code: string;
  title: string;
  mastered: boolean;
}

export interface ObjectivesPanelProps {
  objectives: Objective[];
  onToggleMastered?: (id: number) => void;
  onSendToPacket?: (item: { type: "objectives"; title: string; content: string }) => void;
}

const BTN_CLASSES =
  "px-3 py-1.5 rounded-sm border border-primary/30 bg-background/80 font-terminal text-xs tracking-wider text-primary/80 uppercase hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

export function ObjectivesPanel({
  objectives,
  onToggleMastered,
  onSendToPacket,
}: ObjectivesPanelProps): React.JSX.Element {
  const handleSendAll = (): void => {
    const content = objectives
      .map((o) => `[${o.mastered ? "x" : " "}] ${o.code} - ${o.title}`)
      .join("\n");
    onSendToPacket?.({ type: "objectives", title: "Learning Objectives", content });
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <h2 className="font-terminal text-sm tracking-wider text-primary/80 uppercase">
        OBJECTIVES
      </h2>

      <ul className="flex-1 overflow-auto space-y-2" role="list">
        {objectives.map((obj) => (
          <li
            key={obj.id}
            className="flex items-start gap-2 px-2 py-1.5 rounded-sm border border-primary/10 bg-background/40"
          >
            <input
              type="checkbox"
              checked={obj.mastered}
              onChange={() => onToggleMastered?.(obj.id)}
              aria-label={`Mark ${obj.code} as mastered`}
              className="mt-0.5 accent-primary"
            />
            <span className="font-terminal text-sm text-primary/80">
              <span className="font-bold tracking-wider">{obj.code}</span>
              {" - "}
              <span className={obj.mastered ? "line-through opacity-60" : ""}>
                {obj.title}
              </span>
            </span>
          </li>
        ))}
      </ul>

      {onSendToPacket && (
        <button
          type="button"
          className={BTN_CLASSES}
          disabled={objectives.length === 0}
          onClick={handleSendAll}
        >
          Send All to Packet
        </button>
      )}
    </div>
  );
}
