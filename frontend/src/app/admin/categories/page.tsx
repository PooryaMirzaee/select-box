"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AdminCategoryTree,
  defaultExpandedIds,
} from "@/components/admin/AdminCategoryTree";
import { Button } from "@/components/ui/Button";
import { adminFetch, type CategoryAdmin } from "@/lib/api";
import { apiUrl } from "@/lib/api-base";
import {
  collectDescendantIds,
  findNode,
  parentSelectOptions,
  type CategoryTreeNode,
} from "@/lib/category-tree";

const empty = {
  parent_id: null as number | null,
  slug: "",
  name_fa: "",
  meta_title: "",
  meta_description: "",
  sort_order: 0,
  is_active: true,
};

export default function AdminCategoriesPage() {
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const token = () => localStorage.getItem("selectbox_admin_token")!;

  const load = useCallback(() => {
    adminFetch<CategoryTreeNode[]>("/api/v1/admin/categories/tree", token())
      .then((data) => {
        setTree(data);
        setCheckedIds(new Set());
        setExpandedIds((prev) => {
          const next = defaultExpandedIds(data);
          prev.forEach((id) => next.add(id));
          return next;
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const editing = editId ? findNode(tree, editId) : null;

  const parentOptions = useMemo(() => {
    const exclude = new Set<number>();
    if (editId) {
      const node = findNode(tree, editId);
      if (node) collectDescendantIds(node).forEach((id) => exclude.add(id));
      else exclude.add(editId);
    }
    return parentSelectOptions(tree, exclude);
  }, [tree, editId]);

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetForm() {
    setForm(empty);
    setEditId(null);
    setIconFile(null);
  }

  function startEdit(node: CategoryTreeNode) {
    setEditId(node.id);
    setIconFile(null);
    setForm({
      parent_id: node.parent_id,
      slug: node.slug,
      name_fa: node.name_fa,
      meta_title: node.meta_title ?? "",
      meta_description: node.meta_description ?? "",
      sort_order: node.sort_order ?? 0,
      is_active: node.is_active,
    });
    setExpandedIds((prev) => new Set(prev).add(node.id));
  }

  function startAddChild(parentId: number) {
    resetForm();
    setForm((f) => ({ ...f, parent_id: parentId }));
    setExpandedIds((prev) => new Set(prev).add(parentId));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      ...form,
      parent_id: form.parent_id || null,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
    };
    let categoryId = editId;
    if (editId) {
      await adminFetch(`/api/v1/admin/categories/${editId}`, token(), {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    } else {
      const created = await adminFetch<CategoryAdmin>("/api/v1/admin/categories", token(), {
        method: "POST",
        body: JSON.stringify(body),
      });
      categoryId = created.id;
    }

    if (iconFile && categoryId) {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", iconFile);
      const res = await fetch(apiUrl(`/api/v1/admin/categories/${categoryId}/icon`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      });
      setUploading(false);
      if (!res.ok) alert(await res.text());
    }

    resetForm();
    load();
  }

  function toggleCheck(id: number) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function remove(id: number) {
    const node = findNode(tree, id);
    const childCount = node ? collectDescendantIds(node).size - 1 : 0;
    const hint =
      childCount > 0
        ? ` این دسته ${childCount} زیردسته دارد — همه با هم حذف می‌شوند.`
        : "";
    if (
      !confirm(
        `حذف این دسته؟${hint} اگر محصول وابسته باشد، حذف انجام نمی‌شود.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await adminFetch(`/api/v1/admin/categories/${id}`, token(), { method: "DELETE" });
      if (editId === id) resetForm();
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "حذف دسته ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  async function removeSelected() {
    const ids = [...checkedIds];
    if (!ids.length) return;
    if (
      !confirm(
        `حذف ${ids.length} دسته انتخاب‌شده؟ زیردسته‌ها همراه والد حذف می‌شوند. دسته‌های دارای محصول حذف نمی‌شوند.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await adminFetch<{
        deleted: number[];
        failed: { id: number; reason: string }[];
        deleted_count: number;
      }>("/api/v1/admin/categories/bulk-delete", token(), {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
      if (res.failed.length) {
        const lines = res.failed
          .slice(0, 8)
          .map((f) => `#${f.id}: ${f.reason}`)
          .join("\n");
        alert(
          `${res.deleted_count} حذف شد، ${res.failed.length} ناموفق:\n${lines}${
            res.failed.length > 8 ? "\n…" : ""
          }`,
        );
      }
      if (editId && res.deleted.includes(editId)) resetForm();
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "حذف گروهی ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  async function removeIcon(id: number) {
    await adminFetch(`/api/v1/admin/categories/${id}/icon`, token(), { method: "DELETE" });
    load();
  }

  const formTitle = editId ? "ویرایش دسته" : form.parent_id ? "زیردسته جدید" : "دسته جدید";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">دسته‌بندی‌ها</h1>
          <p className="mt-1 text-sm text-muted">
            ساختار تو در تو — از درخت زیردسته اضافه کنید یا والد را در فرم انتخاب کنید. دسته‌های فعال
            با آیکون در مگامenu هدر فروشگاه نمایش داده می‌شوند.
          </p>
        </div>
        {checkedIds.size > 0 ? (
          <Button variant="outline" disabled={busy} onClick={removeSelected}>
            حذف انتخاب‌شده ({checkedIds.size})
          </Button>
        ) : null}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:items-start">
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted">درخت دسته‌ها</h2>
          <AdminCategoryTree
            tree={tree}
            selectedId={editId}
            expandedIds={expandedIds}
            checkedIds={checkedIds}
            onToggle={toggleExpand}
            onEdit={startEdit}
            onDelete={remove}
            onAddChild={startAddChild}
            onCheckToggle={toggleCheck}
          />
        </section>

        <section className="lg:sticky lg:top-6">
          <h2 className="mb-3 text-sm font-medium text-muted">{formTitle}</h2>
          <form
            onSubmit={save}
            className="grid gap-3 rounded-2xl border border-theme bg-card p-5"
          >
            <input
              placeholder="اسلاگ"
              className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 font-mono text-sm"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              dir="ltr"
              required
            />
            <input
              placeholder="نام فارسی"
              className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
              value={form.name_fa}
              onChange={(e) => setForm({ ...form, name_fa: e.target.value })}
              required
            />
            <select
              className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
              value={form.parent_id ?? ""}
              onChange={(e) =>
                setForm({ ...form, parent_id: e.target.value ? Number(e.target.value) : null })
              }
            >
              <option value="">بدون والد (ریشه)</option>
              {parentOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              placeholder="عنوان سئو"
              className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
              value={form.meta_title}
              onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
            />
            <div>
              <p className="mb-2 text-sm text-muted">آیکون / تصویر</p>
              {editing?.icon_url ? (
                <div className="mb-3 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={editing.icon_url} alt="" className="h-16 w-16 rounded-xl object-cover" />
                  <Button type="button" size="sm" variant="outline" onClick={() => removeIcon(editId!)}>
                    حذف آیکون
                  </Button>
                </div>
              ) : null}
              <input
                type="file"
                accept="image/*"
                className="text-sm"
                onChange={(e) => setIconFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button type="submit" disabled={uploading}>
              {uploading ? "..." : editId ? "ذخیره" : "افزودن"}
            </Button>
            {editId || form.parent_id ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                انصراف
              </Button>
            ) : null}
          </form>
        </section>
      </div>
    </div>
  );
}
