export interface DiagramTemplate {
  id: string
  name: string
  description: string
  mermaid: string
}

export const DIAGRAM_TEMPLATES: DiagramTemplate[] = [
  {
    id: "core-concept",
    name: "Core Concept",
    description: "Single concept with supporting branches",
    mermaid: `graph TD
  A["Core Concept"]
  B["Definition"]
  C["Mechanism"]
  D["Clinical Relevance"]
  A --> B
  A --> C
  A --> D`,
  },
  {
    id: "cause-effect",
    name: "Cause -> Effect",
    description: "Track progression from input to outcomes",
    mermaid: `graph LR
  A["Trigger"]
  B["Pathway"]
  C["Primary Effect"]
  D["Compensation"]
  E["Clinical Signs"]
  A --> B
  B --> C
  C --> D
  C --> E`,
  },
  {
    id: "compare-contrast",
    name: "Compare / Contrast",
    description: "Side-by-side comparison map",
    mermaid: `graph TD
  A["Topic"]
  B["Option A"]
  C["Option B"]
  D["Shared Features"]
  E["Key Differences"]
  A --> B
  A --> C
  B --> D
  C --> D
  B --> E
  C --> E`,
  },
  {
    id: "exam-recall",
    name: "Exam Recall",
    description: "Prompt-based retrieval scaffold",
    mermaid: `graph TD
  A["Prompt"]
  B["Recall Facts"]
  C["Apply to Scenario"]
  D["Pitfalls"]
  E["One-line Takeaway"]
  A --> B
  B --> C
  C --> D
  C --> E`,
  },
]
