import type { SessionMaterialBundle } from "@/lib/sessionMaterialBundle";

const MAX_NODES = 60;
const MAX_EDGES = 80;

function safeId(index: number): string {
  return `C${index + 1}`;
}

function escapeLabel(input: string): string {
  // Mermaid node labels inside [] — strip brackets + pipes, trim quotes, collapse whitespace.
  return input
    .replace(/[\[\]|]/g, " ")
    .replace(/"/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 72);
}

function normalize(text: string | null | undefined): string {
  return (text ?? "").toLowerCase();
}

/**
 * Build a Mermaid flowchart from a SessionMaterialBundle.
 *
 * Nodes: top concepts (capped at MAX_NODES).
 * Edges: A→B when concept A is mentioned inside a root_explanation, summary,
 * or term definition whose "primary concept" is B. Falls back to no edges
 * when we can't find connections — returns a node-only graph rather than
 * breaking.
 */
export function buildConceptMapFromBundle(
  bundle: SessionMaterialBundle,
): string {
  const concepts = bundle.concepts.slice(0, MAX_NODES);
  if (concepts.length === 0) return "";

  const idByConcept = new Map<string, string>();
  concepts.forEach((c, idx) => {
    idByConcept.set(normalize(c.concept), safeId(idx));
  });

  // Build an index of free-form text blobs we can scan for co-occurrence.
  // Each blob carries an optional "primary" concept the blob is about.
  type Blob = { text: string; primary: string | null };
  const blobs: Blob[] = [];

  for (const root of bundle.rootExplanations) {
    blobs.push({ text: normalize(root.text), primary: null });
  }
  for (const summary of bundle.summaries) {
    blobs.push({ text: normalize(summary.text), primary: null });
  }
  for (const term of bundle.terms) {
    if (!term.definition) continue;
    // A term's definition can imply a relationship: if the term itself is a
    // concept, treat the concept as "primary" for this blob.
    const termKey = normalize(term.term);
    const primary = idByConcept.has(termKey) ? termKey : null;
    blobs.push({ text: `${termKey} ${normalize(term.definition)}`, primary });
  }

  const edgeSet = new Set<string>();
  const edges: Array<{ from: string; to: string }> = [];

  for (const blob of blobs) {
    if (!blob.text) continue;
    const primaryKey = blob.primary;
    const hits: string[] = [];
    for (const c of concepts) {
      const key = normalize(c.concept);
      if (primaryKey && key === primaryKey) continue;
      if (blob.text.includes(key)) hits.push(key);
    }
    if (hits.length === 0) continue;

    if (primaryKey) {
      for (const hit of hits) {
        const from = idByConcept.get(primaryKey);
        const to = idByConcept.get(hit);
        if (!from || !to || from === to) continue;
        const key = `${from}->${to}`;
        if (edgeSet.has(key)) continue;
        edgeSet.add(key);
        edges.push({ from, to });
        if (edges.length >= MAX_EDGES) break;
      }
    } else if (hits.length > 1) {
      // Link consecutive hits to form a loose chain so the graph isn't a flat fan.
      for (let i = 0; i < hits.length - 1; i += 1) {
        const from = idByConcept.get(hits[i]);
        const to = idByConcept.get(hits[i + 1]);
        if (!from || !to || from === to) continue;
        const key = `${from}->${to}`;
        if (edgeSet.has(key)) continue;
        edgeSet.add(key);
        edges.push({ from, to });
        if (edges.length >= MAX_EDGES) break;
      }
    }
    if (edges.length >= MAX_EDGES) break;
  }

  const lines: string[] = ["flowchart LR"];
  concepts.forEach((c, idx) => {
    lines.push(`  ${safeId(idx)}[${escapeLabel(c.concept)}]`);
  });
  for (const edge of edges) {
    lines.push(`  ${edge.from} --> ${edge.to}`);
  }
  return lines.join("\n");
}
