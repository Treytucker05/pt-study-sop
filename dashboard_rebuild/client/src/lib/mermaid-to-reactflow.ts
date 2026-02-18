import dagre from "dagre"
import type { Edge, Node } from "@xyflow/react"

export interface MermaidParseResult {
  direction: "TB" | "LR"
  nodes: Node[]
  edges: Edge[]
}

interface LayoutOptions {
  direction?: "TB" | "LR"
  nodeSep?: number
  rankSep?: number
}

const EDGE_MATCHER = /^([A-Za-z0-9_]+)\s*-->\s*(?:\|([^|]+)\|\s*)?([A-Za-z0-9_]+)\s*$/
const NODE_MATCHER = /^([A-Za-z0-9_]+)\s*\[\s*"?(.+?)"?\s*\]\s*$/

function cleanLabel(raw: string): string {
  return raw.replace(/^"+|"+$/g, "").trim()
}

function safeMermaidId(id: string): string {
  const normalized = String(id).replace(/[^A-Za-z0-9_]/g, "_")
  return normalized.length > 0 ? normalized : "N"
}

export function parseMermaid(input: string): MermaidParseResult {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("%%"))

  let direction: "TB" | "LR" = "TB"
  const first = lines[0]?.toLowerCase() || ""
  if (first.startsWith("graph ")) {
    if (first.includes(" lr")) direction = "LR"
    if (first.includes(" tb")) direction = "TB"
    lines.shift()
  }

  const nodes = new Map<string, Node>()
  const edges: Edge[] = []
  let edgeCounter = 1

  for (const line of lines) {
    const edgeMatch = line.match(EDGE_MATCHER)
    if (edgeMatch) {
      const [, sourceRaw, labelRaw, targetRaw] = edgeMatch
      const source = safeMermaidId(sourceRaw)
      const target = safeMermaidId(targetRaw)
      if (!nodes.has(source)) {
        nodes.set(source, {
          id: source,
          type: "structured",
          position: { x: 0, y: 0 },
          data: { label: sourceRaw },
          style: { width: 180, height: 72 },
        })
      }
      if (!nodes.has(target)) {
        nodes.set(target, {
          id: target,
          type: "structured",
          position: { x: 0, y: 0 },
          data: { label: targetRaw },
          style: { width: 180, height: 72 },
        })
      }
      edges.push({
        id: `e-${edgeCounter++}`,
        source,
        target,
        ...(labelRaw ? { data: { label: cleanLabel(labelRaw) } } : {}),
      })
      continue
    }

    const nodeMatch = line.match(NODE_MATCHER)
    if (nodeMatch) {
      const [, rawId, rawLabel] = nodeMatch
      const id = safeMermaidId(rawId)
      const label = cleanLabel(rawLabel)
      const existing = nodes.get(id)
      nodes.set(id, {
        id,
        type: existing?.type || "structured",
        position: existing?.position || { x: 0, y: 0 },
        data: { ...(existing?.data || {}), label },
        style: existing?.style || { width: 180, height: 72 },
      })
    }
  }

  return {
    direction,
    nodes: Array.from(nodes.values()),
    edges,
  }
}

export function toMermaid(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB"
): string {
  const idMap = new Map<string, string>()
  const used = new Set<string>()

  for (const node of nodes) {
    let candidate = safeMermaidId(node.id)
    if (!candidate || used.has(candidate)) {
      let n = 1
      while (used.has(`N${n}`)) n += 1
      candidate = `N${n}`
    }
    used.add(candidate)
    idMap.set(node.id, candidate)
  }

  const lines: string[] = [`graph ${direction}`]

  for (const node of nodes) {
    const id = idMap.get(node.id) || safeMermaidId(node.id)
    const labelRaw = (node.data as { label?: unknown } | undefined)?.label
    const label =
      typeof labelRaw === "string" && labelRaw.trim().length > 0
        ? labelRaw
        : node.id
    const escaped = label.replace(/"/g, '\\"')
    lines.push(`  ${id}["${escaped}"]`)
  }

  for (const edge of edges) {
    const source = idMap.get(edge.source)
    const target = idMap.get(edge.target)
    if (!source || !target) continue
    const labelRaw = (edge.data as { label?: unknown } | undefined)?.label
    if (typeof labelRaw === "string" && labelRaw.trim().length > 0) {
      const edgeLabel = labelRaw.replace(/\|/g, "/").replace(/"/g, '\\"')
      lines.push(`  ${source} -->|${edgeLabel}| ${target}`)
    } else {
      lines.push(`  ${source} --> ${target}`)
    }
  }

  return lines.join("\n")
}

function getNodeSize(node: Node): { width: number; height: number } {
  const widthRaw = (node.style as { width?: unknown } | undefined)?.width
  const heightRaw = (node.style as { height?: unknown } | undefined)?.height
  const width = typeof widthRaw === "number" ? widthRaw : 180
  const height = typeof heightRaw === "number" ? heightRaw : 72
  return { width, height }
}

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): Node[] {
  const direction = options.direction || "TB"
  const graph = new dagre.graphlib.Graph()
  graph.setGraph({
    rankdir: direction,
    nodesep: options.nodeSep ?? 60,
    ranksep: options.rankSep ?? 80,
    marginx: 24,
    marginy: 24,
  })
  graph.setDefaultEdgeLabel(() => ({}))

  for (const node of nodes) {
    const size = getNodeSize(node)
    graph.setNode(node.id, { width: size.width, height: size.height })
  }

  for (const edge of edges) {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.setEdge(edge.source, edge.target)
    }
  }

  dagre.layout(graph)

  return nodes.map((node) => {
    const size = getNodeSize(node)
    const position = graph.node(node.id)
    if (!position) return node
    return {
      ...node,
      position: {
        x: position.x - size.width / 2,
        y: position.y - size.height / 2,
      },
    }
  })
}
