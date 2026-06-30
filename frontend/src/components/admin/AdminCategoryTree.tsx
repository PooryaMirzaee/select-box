"use client";

import { ChevronDown, FolderPlus, Pencil, Trash2 } from "@/components/icons";

import { Button } from "@/components/ui/Button";
import {
  type CategoryTreeNode,
  flattenTree,
} from "@/lib/category-tree";
import { cn } from "@/lib/utils";

type Props = {
  tree: CategoryTreeNode[];
  selectedId: number | null;
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
  onEdit: (node: CategoryTreeNode) => void;
  onDelete: (id: number) => void;
  onAddChild: (parentId: number) => void;
};

export function AdminCategoryTree({
  tree,
  selectedId,
  expandedIds,
  onToggle,
  onEdit,
  onDelete,
  onAddChild,
}: Props) {
  if (!tree.length) {
    return (
      <p className="rounded-xl border border-dashed border-theme px-4 py-8 text-center text-sm text-muted">
        هنوز دسته‌ای نیست — فرم کنار را پر کنید.
      </p>
    );
  }

  return (
    <ul className="space-y-1" role="tree">
      {tree.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          selectedId={selectedId}
          expandedIds={expandedIds}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
        />
      ))}
    </ul>
  );
}

function TreeNode({
  node,
  depth,
  selectedId,
  expandedIds,
  onToggle,
  onEdit,
  onDelete,
  onAddChild,
}: {
  node: CategoryTreeNode;
  depth: number;
  selectedId: number | null;
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
  onEdit: (node: CategoryTreeNode) => void;
  onDelete: (id: number) => void;
  onAddChild: (parentId: number) => void;
}) {
  const hasKids = node.children.length > 0;
  const open = expandedIds.has(node.id);
  const selected = selectedId === node.id;

  return (
    <li role="treeitem" aria-selected={selected} aria-expanded={hasKids ? open : undefined}>
      <div
        className={cn(
          "group flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition",
          selected
            ? "border-[var(--accent)]/50 bg-surface"
            : "border-theme hover:border-theme",
        )}
        style={{ marginInlineStart: depth * 16 }}
      >
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-[var(--fg)]"
          onClick={() => hasKids && onToggle(node.id)}
          aria-label={open ? "بستن" : "باز کردن"}
          disabled={!hasKids}
        >
          {hasKids ? (
            <ChevronDown className={cn("h-4 w-4 transition", !open && "-rotate-90")} />
          ) : (
            <span className="inline-block w-4" />
          )}
        </button>

        {node.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={node.icon_url} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-muted">
            {node.name_fa.charAt(0)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug">{node.name_fa}</p>
          <p className="font-mono text-xs text-muted">{node.slug}</p>
        </div>

        <div className="flex w-full flex-wrap gap-1.5 sm:ms-auto sm:w-auto">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => onAddChild(node.id)}
          >
            <FolderPlus className="h-3.5 w-3.5" />
            زیردسته
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onEdit(node)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onDelete(node.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {hasKids && open ? (
        <ul className="mt-1 space-y-1 border-s border-theme ps-2" role="group">
          {node.children.map((ch) => (
            <TreeNode
              key={ch.id}
              node={ch}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** همهٔ گره‌ها را برای expand پیش‌فرض باز می‌کند */
export function defaultExpandedIds(tree: CategoryTreeNode[]): Set<number> {
  return new Set(flattenTree(tree).map((n) => n.id));
}
