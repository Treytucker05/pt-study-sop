import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface MethodRunnerPanelProps {
  availableMethods: Array<{
    id: number;
    method_id: string;
    title: string;
    category: string;
    description?: string;
  }>;
  onRunMethod?: (methodId: string) => Promise<string>;
  onSendToPacket?: (item: {
    type: "method_output";
    title: string;
    content: string;
    methodId: string;
  }) => void;
}

type PanelMode = "picker" | "running" | "output";

interface RunState {
  mode: PanelMode;
  selectedMethod: MethodRunnerPanelProps["availableMethods"][number] | null;
  output: string;
}

const INITIAL_STATE: RunState = {
  mode: "picker",
  selectedMethod: null,
  output: "",
};

const CATEGORY_COLORS: Record<string, string> = {
  retrieve: "bg-green-500/20 text-green-400 border-green-500/30",
  encode: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  review: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  organize: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const DEFAULT_BADGE = "bg-primary/10 text-primary/70 border-primary/20";

export function MethodRunnerPanel({
  availableMethods,
  onRunMethod,
  onSendToPacket,
}: MethodRunnerPanelProps): React.ReactElement {
  const [state, setState] = useState<RunState>(INITIAL_STATE);

  const handleSelectMethod = useCallback(
    async (method: MethodRunnerPanelProps["availableMethods"][number]) => {
      setState({ mode: "running", selectedMethod: method, output: "" });

      if (!onRunMethod) {
        setState({ mode: "output", selectedMethod: method, output: "(no runner configured)" });
        return;
      }

      try {
        const result = await onRunMethod(method.method_id);
        setState({ mode: "output", selectedMethod: method, output: result });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setState({
          mode: "output",
          selectedMethod: method,
          output: `Error: ${message}`,
        });
      }
    },
    [onRunMethod],
  );

  const handleRunAnother = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const handleSendToPacket = useCallback(() => {
    if (!state.selectedMethod || !onSendToPacket) return;
    onSendToPacket({
      type: "method_output",
      title: state.selectedMethod.title,
      content: state.output,
      methodId: state.selectedMethod.method_id,
    });
  }, [state, onSendToPacket]);

  // -- Title computation --
  const title = (() => {
    switch (state.mode) {
      case "running":
        return `RUNNING: ${state.selectedMethod?.title ?? ""}`;
      case "output":
        return `${state.selectedMethod?.title ?? ""} OUTPUT`;
      default:
        return "METHOD RUNNER";
    }
  })();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-primary/20">
        <h3 className="font-terminal text-sm tracking-wider text-primary/80 uppercase">
          {title}
        </h3>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-3">
        {state.mode === "picker" && (
          <PickerView
            methods={availableMethods}
            onSelect={handleSelectMethod}
          />
        )}

        {state.mode === "running" && <RunningView />}

        {state.mode === "output" && (
          <OutputView
            output={state.output}
            onRunAnother={handleRunAnother}
            onSendToPacket={onSendToPacket ? handleSendToPacket : undefined}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-views ────────────────────────────────────────────────────────────

function PickerView({
  methods,
  onSelect,
}: {
  methods: MethodRunnerPanelProps["availableMethods"];
  onSelect: (m: MethodRunnerPanelProps["availableMethods"][number]) => void;
}) {
  if (methods.length === 0) {
    return (
      <p className="text-primary/50 text-sm text-center py-6">
        No methods available
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {methods.map((method) => (
        <li key={method.id}>
          <button
            type="button"
            onClick={() => onSelect(method)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-sm",
              "bg-background/40 border border-primary/10",
              "hover:border-primary/30 hover:bg-primary/5",
              "transition-colors cursor-pointer",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="font-terminal text-sm text-primary/90">
                {method.title}
              </span>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-sm border uppercase font-terminal tracking-wider",
                  CATEGORY_COLORS[method.category] ?? DEFAULT_BADGE,
                )}
              >
                {method.category}
              </span>
            </div>
            {method.description && (
              <p className="text-xs text-primary/50 mt-1 line-clamp-1">
                {method.description}
              </p>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

function RunningView() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary/80 rounded-full animate-spin" />
        <p className="font-terminal text-xs text-primary/60 tracking-wider uppercase">
          Processing...
        </p>
      </div>
    </div>
  );
}

function OutputView({
  output,
  onRunAnother,
  onSendToPacket,
}: {
  output: string;
  onRunAnother: () => void;
  onSendToPacket?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 h-full">
      <pre className="flex-1 overflow-auto text-xs font-mono text-primary/80 bg-background/40 border border-primary/10 rounded-sm p-3 whitespace-pre-wrap">
        {output}
      </pre>

      <div className="flex gap-2">
        {onSendToPacket && (
          <button
            type="button"
            onClick={onSendToPacket}
            className={cn(
              "px-3 py-1.5 text-xs font-terminal tracking-wider uppercase rounded-sm",
              "bg-primary/10 border border-primary/20 text-primary/80",
              "hover:bg-primary/20 transition-colors",
            )}
          >
            Send to Packet
          </button>
        )}
        <button
          type="button"
          onClick={onRunAnother}
          className={cn(
            "px-3 py-1.5 text-xs font-terminal tracking-wider uppercase rounded-sm",
            "bg-background/40 border border-primary/10 text-primary/60",
            "hover:border-primary/30 hover:text-primary/80 transition-colors",
          )}
        >
          Run Another
        </button>
      </div>
    </div>
  );
}
