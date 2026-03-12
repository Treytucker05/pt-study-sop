import { useEffect, useRef, useState } from "react";

import Layout from "@/components/layout";
import { MainContent } from "@/components/brain/MainContent";
import { useBrainWorkspace } from "@/components/brain/useBrainWorkspace";

export default function Brain() {
  const workspace = useBrainWorkspace();
  const [ready, setReady] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setReady(true));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <Layout>
      <div
        className={`relative z-30 flex h-full min-h-0 w-full flex-col overflow-hidden ${ready ? "brain-workspace--ready" : ""}`}
        data-active-tab={workspace.mainMode}
      >
        <div className="flex-1 min-h-0 border border-primary/20 bg-black/35">
          <MainContent workspace={workspace} />
        </div>
      </div>
    </Layout>
  );
}
