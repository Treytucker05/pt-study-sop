export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  images?: string[];
  meta?: {
    cardsCreated?: number;
    sessionSaved?: boolean;
    sessionId?: number | null;
  };
}

export type Mode = "chat" | "ingest";
export type IngestTarget = "anki" | "obsidian" | "both";

export type ApiContent = string | Array<{
  type: string;
  text?: string;
  image_url?: { url: string };
}>;

export interface ChecklistState {
  [key: string]: boolean;
}

export const CHATGPT_ANKI_PROMPT = `Generate Anki flashcards from the following study material. Output ONLY a numbered list in this exact format:

1. Front: [question]
Back: [answer]
Tags: [comma-separated tags like: Module1, Obj2, TopicName]

Rules:
- Front = the question only (no module/objective prefixes)
- Back = concise answer
- Tags = include Module#, Obj#, and topic keywords
- One card per concept
- No extra text before or after the list

Study material:
[PASTE YOUR NOTES HERE]`;

export function buildApiContent(text: string, images: string[]): ApiContent {
  if (images.length === 0) return text;
  const parts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
  for (const img of images) {
    parts.push({ type: "image_url", image_url: { url: img } });
  }
  if (text.trim()) parts.push({ type: "text", text });
  return parts;
}
