export type DocumentPaneSplitDirection = "horizontal" | "vertical";

/** Side-by-side panes (vertical divider). */
export const SPLIT_SIDE_BY_SIDE: DocumentPaneSplitDirection = "horizontal";

/** Stacked panes (horizontal divider). */
export const SPLIT_STACKED: DocumentPaneSplitDirection = "vertical";

export type DocumentPaneLeaf = {
  type: "leaf";
  id: string;
  tabId: string | null;
};

export type DocumentPaneSplit = {
  type: "split";
  id: string;
  direction: DocumentPaneSplitDirection;
  children: [DocumentPaneNode, DocumentPaneNode];
};

export type DocumentPaneNode = DocumentPaneLeaf | DocumentPaneSplit;

export const MAX_DOCUMENT_PANE_LEAVES = 6;

let nextPaneId = 1;

export function createDocumentPaneId(): string {
  const id = nextPaneId;
  nextPaneId += 1;
  return `pane-${id}`;
}

export function resetDocumentPaneIdCounterForTests(next = 1): void {
  nextPaneId = next;
}

export function createDocumentPaneLayout(
  tabId: string | null = null,
): DocumentPaneLeaf {
  return {
    type: "leaf",
    id: createDocumentPaneId(),
    tabId,
  };
}

export function isDocumentPaneLeaf(
  node: DocumentPaneNode,
): node is DocumentPaneLeaf {
  return node.type === "leaf";
}

export function collectDocumentPaneLeaves(
  node: DocumentPaneNode,
): DocumentPaneLeaf[] {
  if (node.type === "leaf") {
    return [node];
  }

  return [
    ...collectDocumentPaneLeaves(node.children[0]),
    ...collectDocumentPaneLeaves(node.children[1]),
  ];
}

export function findDocumentPaneLeaf(
  node: DocumentPaneNode,
  leafId: string,
): DocumentPaneLeaf | null {
  if (node.type === "leaf") {
    return node.id === leafId ? node : null;
  }

  return (
    findDocumentPaneLeaf(node.children[0], leafId) ||
    findDocumentPaneLeaf(node.children[1], leafId)
  );
}

function mapDocumentPaneNode(
  node: DocumentPaneNode,
  leafId: string,
  updater: (leaf: DocumentPaneLeaf) => DocumentPaneNode,
): DocumentPaneNode {
  if (node.type === "leaf") {
    return node.id === leafId ? updater(node) : node;
  }

  return {
    ...node,
    children: [
      mapDocumentPaneNode(node.children[0], leafId, updater),
      mapDocumentPaneNode(node.children[1], leafId, updater),
    ],
  };
}

export function assignTabToDocumentPane(
  root: DocumentPaneNode,
  leafId: string,
  tabId: string | null,
): DocumentPaneNode {
  return mapDocumentPaneNode(root, leafId, (leaf) => ({
    ...leaf,
    tabId,
  }));
}

export function splitDocumentPane(
  root: DocumentPaneNode,
  leafId: string,
  direction: DocumentPaneSplitDirection,
): DocumentPaneNode | null {
  const leafCount = collectDocumentPaneLeaves(root).length;
  if (leafCount >= MAX_DOCUMENT_PANE_LEAVES) {
    return null;
  }

  return mapDocumentPaneNode(root, leafId, (leaf) => ({
    type: "split",
    id: createDocumentPaneId(),
    direction,
    children: [
      { ...leaf },
      createDocumentPaneLayout(null),
    ],
  }));
}

function removeLeafFromTree(
  node: DocumentPaneNode,
  leafId: string,
): DocumentPaneNode | null {
  if (node.type === "leaf") {
    return node.id === leafId ? null : node;
  }

  const left = removeLeafFromTree(node.children[0], leafId);
  const right = removeLeafFromTree(node.children[1], leafId);

  if (left === null) return right;
  if (right === null) return left;

  return {
    ...node,
    children: [left, right],
  };
}

export function closeDocumentPaneLeaf(
  root: DocumentPaneNode,
  leafId: string,
): DocumentPaneNode {
  const leaves = collectDocumentPaneLeaves(root);
  if (leaves.length <= 1) {
    const remaining = leaves[0];
    return {
      type: "leaf",
      id: remaining?.id ?? createDocumentPaneId(),
      tabId: null,
    };
  }

  const next = removeLeafFromTree(root, leafId);
  return next ?? createDocumentPaneLayout(null);
}

export function clearTabFromDocumentPanes(
  root: DocumentPaneNode,
  tabId: string,
): DocumentPaneNode {
  if (root.type === "leaf") {
    return root.tabId === tabId ? { ...root, tabId: null } : root;
  }

  return {
    ...root,
    children: [
      clearTabFromDocumentPanes(root.children[0], tabId),
      clearTabFromDocumentPanes(root.children[1], tabId),
    ],
  };
}

export function getPrimaryDocumentPaneLeaf(
  root: DocumentPaneNode,
): DocumentPaneLeaf {
  return collectDocumentPaneLeaves(root)[0] ?? createDocumentPaneLayout(null);
}
