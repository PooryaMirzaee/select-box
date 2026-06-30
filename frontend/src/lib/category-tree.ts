import type { CategoryAdmin } from "@/lib/api";

export type CategoryTreeNode = CategoryAdmin & { children: CategoryTreeNode[] };

export function collectDescendantIds(node: CategoryTreeNode): Set<number> {
  const ids = new Set<number>();
  function walk(n: CategoryTreeNode) {
    ids.add(n.id);
    n.children.forEach(walk);
  }
  walk(node);
  return ids;
}

export function findNode(tree: CategoryTreeNode[], id: number): CategoryTreeNode | null {
  for (const n of tree) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}

/** گزینه‌های والد با تورفتگی برای select */
export function parentSelectOptions(
  tree: CategoryTreeNode[],
  excludeIds: Set<number>,
  depth = 0,
): { id: number; label: string }[] {
  const out: { id: number; label: string }[] = [];
  const pad = depth > 0 ? `${"— ".repeat(depth)}` : "";
  for (const n of tree) {
    if (!excludeIds.has(n.id)) {
      out.push({ id: n.id, label: `${pad}${n.name_fa}` });
      out.push(...parentSelectOptions(n.children, excludeIds, depth + 1));
    }
  }
  return out;
}

export function flattenTree(tree: CategoryTreeNode[]): CategoryTreeNode[] {
  const out: CategoryTreeNode[] = [];
  function walk(nodes: CategoryTreeNode[]) {
    for (const n of nodes) {
      out.push(n);
      walk(n.children);
    }
  }
  walk(tree);
  return out;
}
