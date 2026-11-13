"use client";

import { useState, type FormEvent } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Pencil, Search, UserPlus, Users } from "lucide-react";
import { Pagination } from "@/components/staff/ComplaintTable";
import { PageHeader } from "@/components/shell/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { userService } from "@/lib/api";
import { errorMessage, isApiError } from "@/lib/api/errors";
import type { StaffRole, User, UserListParams } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { timeAgo } from "@/lib/format";
import { roleLabel } from "@/lib/nav";
import { BARANGAY_NAMES } from "@/lib/pasig";

const PAGE_SIZE = 20;

/** 12 characters from an unambiguous alphabet, for the first sign-in. */
export function generatePassword(random: (n: number) => number = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () => alphabet[random(alphabet.length)]).join("");
}

export function UserManagement() {
  const { user: me } = useAuth();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<StaffRole | "">("");
  const [active, setActive] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<User | "new" | null>(null);

  const params: UserListParams = { q: q.trim() || undefined, role: role || undefined, is_active: active === "" ? undefined : active === "true", page, page_size: PAGE_SIZE };
  const users = useQuery({ queryKey: ["users", params], queryFn: () => userService.list(params), placeholderData: keepPreviousData });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Users"
        description="Accounts for barangay officials and Pasig administrators. Residents create their own accounts."
        actions={
          <Button leadingIcon={<UserPlus aria-hidden size={18} strokeWidth={1.75} />} onClick={() => setEditing("new")}>
            Add a staff account
          </Button>
        }
      />

      <div className="grid gap-3 rounded-card border border-border bg-surface p-4 shadow-card sm:grid-cols-[minmax(0,1fr)_12rem_12rem]">
        <div>
          <label htmlFor="user-search" className="sr-only">Search users</label>
          <Input id="user-search" type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name or email" leadingIcon={<Search size={18} strokeWidth={1.75} />} />
        </div>
        <div>
          <label htmlFor="user-role" className="sr-only">Role</label>
          <Select id="user-role" value={role} onChange={(e) => { setRole(e.target.value as StaffRole | ""); setPage(1); }}>
            <option value="">All roles</option>
            <option value="official">Barangay officials</option>
            <option value="pasig_admin">Pasig administrators</option>
          </Select>
        </div>
        <div>
          <label htmlFor="user-active" className="sr-only">Status</label>
          <Select id="user-active" value={active} onChange={(e) => { setActive(e.target.value as "" | "true" | "false"); setPage(1); }}>
            <option value="">Active and inactive</option>
            <option value="true">Active only</option>
            <option value="false">Deactivated only</option>
          </Select>
        </div>
      </div>

      <Card padding="none" className="overflow-hidden">
        {users.isPending && (
          <div aria-busy="true" className="grid gap-3 p-5">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        )}
        {users.isError && <div className="p-5"><Alert tone="danger" title="We couldn't load users">{errorMessage(users.error)}</Alert></div>}
        {users.data && users.data.items.length === 0 && <EmptyState icon={<Users size={24} strokeWidth={1.75} />} title="No accounts match" description="Try a different search or filter." />}
        {users.data && users.data.items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-2xl text-left text-sm">
                <caption className="sr-only">Staff accounts</caption>
                <thead className="border-b border-border bg-page text-xs font-semibold uppercase tracking-eyebrow text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-3">Name</th>
                    <th scope="col" className="px-3 py-3">Role</th>
                    <th scope="col" className="px-3 py-3">Barangay</th>
                    <th scope="col" className="px-3 py-3">Status</th>
                    <th scope="col" className="px-3 py-3">Last sign-in</th>
                    <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.data.items.map((u) => (
                    <tr key={u.id} className={u.is_active ? "" : "bg-page/60"}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.full_name} size="sm" />
                          <div className="min-w-0">
                            <p className="font-semibold text-ink">{u.full_name}{u.id === me?.id && <span className="ml-2 text-xs font-medium text-muted">(you)</span>}</p>
                            <p className="truncate text-muted">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3"><Badge tone={u.role === "pasig_admin" ? "brand" : "neutral"}>{roleLabel[u.role]}</Badge></td>
                      <td className="px-3 py-3 text-ink">{u.barangay ?? "—"}</td>
                      <td className="px-3 py-3">{u.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Deactivated</Badge>}</td>
                      <td className="px-3 py-3 text-muted">{u.last_login_at ? timeAgo(u.last_login_at) : "Never"}</td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="ghost" size="sm" leadingIcon={<Pencil aria-hidden size={16} strokeWidth={1.75} />} onClick={() => setEditing(u)} aria-label={`Edit ${u.full_name}`}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={users.data.total} onPage={setPage} />
          </>
        )}
      </Card>

      {editing && <UserDialog user={editing === "new" ? null : editing} isSelf={editing !== "new" && editing.id === me?.id} onClose={() => setEditing(null)} />}
    </div>
  );
}

function UserDialog({ user, isSelf, onClose }: { user: User | null; isSelf: boolean; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const creating = user === null;
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<StaffRole>((user?.role as StaffRole) ?? "official");
  const [barangay, setBarangay] = useState(user?.barangay ?? "");
  const [password, setPassword] = useState(creating ? generatePassword() : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async (patch?: { is_active: boolean }) => {
      if (patch) return userService.update(user!.id, patch);
      if (creating) return userService.create({ email: email.trim(), password, full_name: fullName.trim(), role, barangay: barangay || null });
      return userService.update(user!.id, { full_name: fullName.trim(), role, barangay: barangay || null, ...(password ? { password } : {}) });
    },
    onSuccess: async (saved, patch) => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.show({
        tone: "success",
        title: creating ? `Account created for ${saved.full_name}` : patch ? (saved.is_active ? `${saved.full_name} reactivated` : `${saved.full_name} deactivated`) : "Changes saved",
        description: creating ? "Share the temporary password with them privately." : undefined,
      });
      onClose();
    },
    onError: (e) => {
      if (isApiError(e) && e.status === 409) return setErrors({ email: "An account with this email already exists." });
      if (isApiError(e) && Object.keys(e.fieldErrors).length) return setErrors(e.fieldErrors);
      setFormError(errorMessage(e));
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const found: Record<string, string> = {};
    if (!fullName.trim()) found.full_name = "Enter their full name.";
    if (creating && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) found.email = "Enter a valid email.";
    if ((creating || password) && password.length < 8) found.password = "Use at least 8 characters.";
    if (role === "official" && !barangay) found.barangay = "Officials need a barangay.";
    setErrors(found);
    if (Object.keys(found).length === 0) save.mutate(undefined);
  }

  return (
    <Modal
      open
      onClose={onClose}
      // Names keep their own casing, so the fragment skips Title Case ("Juan dela Cruz").
      title={creating ? "Add a staff account" : <>Edit {user!.full_name}</>}
      description={creating ? "They sign in at the staff sign-in page with this email and password." : user!.email}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="user-form" loading={save.isPending && save.variables === undefined}>
            {creating ? "Create account" : "Save changes"}
          </Button>
        </>
      }
    >
      <form id="user-form" noValidate onSubmit={submit} className="grid gap-4">
        {formError && <Alert tone="danger" title={formError} />}
        <Field label="Full name" required error={errors.full_name}>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="off" />
        </Field>
        {creating && (
          <Field label="Work email" required error={errors.email}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@pasig.gov.ph" autoComplete="off" />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Role" required helper={isSelf ? "You can't change your own role." : undefined}>
            <Select value={role} disabled={isSelf} onChange={(e) => setRole(e.target.value as StaffRole)}>
              <option value="official">Barangay official</option>
              <option value="pasig_admin">Pasig administrator</option>
            </Select>
          </Field>
          <Field label="Barangay" required={role === "official"} hint={role === "official" ? undefined : "Optional"} error={errors.barangay}>
            <Select value={barangay} onChange={(e) => setBarangay(e.target.value)}>
              <option value="">No barangay</option>
              {BARANGAY_NAMES.map((b) => <option key={b} value={b}>{b}</option>)}
            </Select>
          </Field>
        </div>
        <Field
          label={creating ? "Temporary password" : "Reset password"}
          hint={creating ? undefined : "Optional"}
          error={errors.password}
          helper={creating ? "Generated for you. Copy it now; it won't be shown again." : "Leave empty to keep the current password."}
        >
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="font-mono"
            autoComplete="new-password"
            trailing={
              <Button variant="ghost" size="sm" onClick={() => setPassword(generatePassword())} aria-label="Generate a password" leadingIcon={<KeyRound aria-hidden size={16} strokeWidth={1.75} />}>
                New
              </Button>
            }
          />
        </Field>
      </form>

      {!creating && (
        <div className="mt-6 flex flex-col gap-3 rounded-card border border-border bg-page p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-ink">{user!.is_active ? "Deactivate this account" : "Reactivate this account"}</p>
            <p className="text-sm text-muted">
              {isSelf ? "You can't deactivate your own account." : user!.is_active ? "They won't be able to sign in. Their history stays." : "They'll be able to sign in again."}
            </p>
          </div>
          <Button
            variant={user!.is_active ? "danger" : "secondary"}
            size="sm"
            disabled={isSelf}
            loading={save.isPending && save.variables !== undefined}
            onClick={() => save.mutate({ is_active: !user!.is_active })}
          >
            {user!.is_active ? "Deactivate" : "Reactivate"}
          </Button>
        </div>
      )}
    </Modal>
  );
}
