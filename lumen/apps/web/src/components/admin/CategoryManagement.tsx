"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderPlus, Pencil } from "lucide-react";
import { CategoryIcon } from "@/components/complaints/CategoryIcon";
import { PageHeader } from "@/components/shell/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { categoryService } from "@/lib/api";
import { errorMessage, isApiError } from "@/lib/api/errors";
import type { Category } from "@/lib/api/types";
import { queryKeys } from "@/lib/queries";

/** "Fallen trees & debris" -> "fallen_trees_debris", the backend's code format. */
export function codeFromName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

export function CategoryManagement() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const categories = useQuery({ queryKey: ["categories", "all"], queryFn: () => categoryService.list({ includeInactive: true }) });
  const [editing, setEditing] = useState<Category | "new" | null>(null);

  const toggle = useMutation({
    mutationFn: (c: Category) => categoryService.update(c.id, { is_active: !c.is_active }),
    onSuccess: async (c) => {
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      toast.show({ tone: "success", title: c.is_active ? `${c.name} is available again` : `${c.name} is hidden from residents` });
    },
    onError: (e) => toast.show({ tone: "danger", title: "Couldn't update the category", description: errorMessage(e) }),
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Categories"
        description="What residents can choose when they report. Hiding a category keeps its old reports."
        actions={<Button leadingIcon={<FolderPlus aria-hidden size={18} strokeWidth={1.75} />} onClick={() => setEditing("new")}>Add a category</Button>}
      />
      {categories.isError && <Alert tone="danger" title="We couldn't load categories">{errorMessage(categories.error)}</Alert>}
      {categories.isPending ? (
        <div aria-busy="true" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-36 rounded-card" />)}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(categories.data ?? []).map((c) => (
            <li key={c.id}>
              <Card className={c.is_active ? "h-full" : "h-full bg-page"}>
                <div className="flex items-start gap-3">
                  <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600">
                    <CategoryIcon code={c.code} size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg leading-snug">{c.name}</h2>
                    <p className="font-mono text-xs text-muted">{c.code}</p>
                  </div>
                  {c.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Hidden</Badge>}
                </div>
                <p className="mt-3 text-sm text-muted">{c.description ?? "No description"}</p>
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" size="sm" leadingIcon={<Pencil aria-hidden size={14} strokeWidth={1.75} />} onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" loading={toggle.isPending && toggle.variables?.id === c.id} onClick={() => toggle.mutate(c)} aria-label={`${c.is_active ? "Hide" : "Show"} ${c.name}`}>
                    {c.is_active ? "Hide" : "Show"}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {editing && <CategoryDialog category={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function CategoryDialog({ category, onClose }: { category: Category | null; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const creating = category === null;
  const [name, setName] = useState(category?.name ?? "");
  const [code, setCode] = useState(category?.code ?? "");
  const [codeTouched, setCodeTouched] = useState(false);
  const [description, setDescription] = useState(category?.description ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: () =>
      creating
        ? categoryService.create({ code, name: name.trim(), description: description.trim() || null })
        : categoryService.update(category!.id, { name: name.trim(), description: description.trim() || null }),
    onSuccess: async (c) => {
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.show({ tone: "success", title: creating ? `${c.name} added` : "Category saved" });
      onClose();
    },
    onError: (e) => {
      if (isApiError(e) && e.status === 409) return setErrors({ code: "That code is already used." });
      setErrors(isApiError(e) && Object.keys(e.fieldErrors).length ? e.fieldErrors : { _: errorMessage(e) });
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (!name.trim()) found.name = "Enter a name.";
    if (creating && !/^[a-z0-9_]{2,50}$/.test(code)) found.code = "Use 2–50 lowercase letters, numbers or underscores.";
    setErrors(found);
    if (!Object.keys(found).length) save.mutate();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={creating ? "Add a category" : `Edit ${category!.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="category-form" loading={save.isPending}>{creating ? "Add category" : "Save"}</Button>
        </>
      }
    >
      <form id="category-form" noValidate onSubmit={submit} className="grid gap-4">
        {errors._ && <Alert tone="danger" title={errors._} />}
        <Field label="Name" required error={errors.name} helper="Residents see this when they report.">
          <Input
            value={name}
            maxLength={100}
            onChange={(e) => {
              setName(e.target.value);
              if (creating && !codeTouched) setCode(codeFromName(e.target.value));
            }}
          />
        </Field>
        <Field label="Code" required={creating} error={errors.code} helper={creating ? "Used by the system. It can't be changed later." : "Codes can't be changed."}>
          <Input value={code} disabled={!creating} className="font-mono" onChange={(e) => { setCodeTouched(true); setCode(e.target.value); }} />
        </Field>
        <Field label="Description" hint="Optional" helper="A short hint shown under the name.">
          <Textarea rows={2} maxLength={255} showCount value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
