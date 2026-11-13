"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight, Camera, ClipboardList, HandHeart, Mail, MapPin, PanelRight, Plus, Search, Trash2 } from "lucide-react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Drawer,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  Skeleton,
  Spinner,
  StatusBadge,
  Tabs,
  Textarea,
  useToast,
  type DisplayStatus,
} from "@/components/ui";

export const galleryComponents = [
  "Button",
  "Field and inputs",
  "Checkbox",
  "Card",
  "Status and badges",
  "Alert",
  "Toast",
  "Modal and drawer",
  "Tabs",
  "Loading",
  "Empty state",
  "Avatar",
] as const;

const icon = { size: 18, strokeWidth: 1.75, "aria-hidden": true } as const;

function Demo({ title, children }: { title: (typeof galleryComponents)[number]; children: ReactNode }) {
  return (
    <Card>
      <h3 className="text-lg">{title}</h3>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

const statuses: DisplayStatus[] = ["open", "in_progress", "resolved", "rejected", "pending_verification", "reopened"];

export function ComponentGallery() {
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Demo title="Button">
        <div className="flex flex-wrap gap-3">
          <Button leadingIcon={<Plus {...icon} />}>Report an issue</Button>
          <Button variant="accent" leadingIcon={<HandHeart {...icon} />}>
            Me Too
          </Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="ghost" trailingIcon={<ArrowRight {...icon} />}>
            View all
          </Button>
          <Button variant="danger" leadingIcon={<Trash2 {...icon} />}>
            Reject
          </Button>
          <Button
            loading={loading}
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 1500);
            }}
          >
            {loading ? "Submitting" : "Try loading"}
          </Button>
          <Button size="sm" variant="secondary">
            Small
          </Button>
          <Button disabled>Disabled</Button>
        </div>
      </Demo>

      <Demo title="Field and inputs">
        <div className="grid gap-4">
          <Field label="Email address" helper="Use the email you registered with." required>
            <Input type="email" placeholder="juan@example.com" leadingIcon={<Mail {...icon} />} autoComplete="email" />
          </Field>
          <Field label="Search complaints" error="Type at least 2 characters.">
            <Input defaultValue="a" leadingIcon={<Search {...icon} />} />
          </Field>
          <Field label="Category" required>
            <Select placeholder="Choose a category">
              <option value="roads">Roads and Potholes</option>
              <option value="flooding_drainage">Flooding and Drainage</option>
              <option value="garbage">Garbage and Waste</option>
            </Select>
          </Field>
          <Field label="Describe the issue" helper="What, where, and since when." hint="Required">
            <Textarea maxLength={500} showCount placeholder="The drain on Shaw Blvd near the market is clogged..." />
          </Field>
        </div>
      </Demo>

      <Demo title="Checkbox">
        <div className="grid gap-4">
          <Checkbox label="Keep me signed in" description="Only on this device." />
          <Checkbox label="Email me when the status changes" defaultChecked />
        </div>
      </Demo>

      <Demo title="Card">
        <div className="grid gap-3">
          <Card padding="sm" interactive>
            <CardHeader
              icon={<MapPin {...icon} />}
              title="Clogged drain on Shaw Blvd"
              description="PSG-2026-000123 · Barangay Kapitolyo"
              action={<StatusBadge status="in_progress" size="sm" />}
            />
          </Card>
          <p className="text-sm text-muted">Hover the card: the shadow strengthens, the card does not move.</p>
        </div>
      </Demo>

      <Demo title="Status and badges">
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge>Roads</Badge>
          <Badge tone="brand">Official</Badge>
          <Badge tone="accent">
            <HandHeart size={12} strokeWidth={2} aria-hidden /> 24 Me Too
          </Badge>
          <Badge tone="info">New</Badge>
          <Badge tone="success">On time</Badge>
          <Badge tone="warning">Due in 1 day</Badge>
          <Badge tone="danger">Overdue</Badge>
        </div>
      </Demo>

      <Demo title="Alert">
        <div className="grid gap-3">
          <Alert tone="warning" title="Similar report nearby" action={<Button size="sm" variant="accent">Me Too</Button>}>
            Someone reported a clogged drain 30 m from your pin 2 days ago.
          </Alert>
          <Alert tone="danger" title="Could not sign in">
            Check your email and password and try again.
          </Alert>
          <Alert tone="success" title="Report submitted" onDismiss={() => {}} />
        </div>
      </Demo>

      <Demo title="Toast">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => toast.show({ tone: "success", title: "Report submitted", description: "Reference PSG-2026-000123" })}
          >
            Success toast
          </Button>
          <Button variant="secondary" onClick={() => toast.show({ tone: "danger", title: "Upload failed", description: "Photos must be under 10 MB." })}>
            Error toast
          </Button>
          <Button variant="secondary" onClick={() => toast.show({ tone: "info", title: "Status changed to In progress" })}>
            Info toast
          </Button>
        </div>
      </Demo>

      <Demo title="Modal and drawer">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
          <Button variant="secondary" leadingIcon={<PanelRight {...icon} />} onClick={() => setDrawerOpen(true)}>
            Open drawer
          </Button>
        </div>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Change status"
          description="Residents who reported or supported this issue will be notified."
          footer={
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setModalOpen(false)}>Save status</Button>
            </>
          }
        >
          <div className="grid gap-4">
            <Field label="New status" required>
              <Select defaultValue="in_progress">
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </Select>
            </Field>
            <Field label="Note to residents" hint="Optional">
              <Textarea rows={3} maxLength={500} showCount />
            </Field>
          </div>
        </Modal>
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="PSG-2026-000123" description="Clogged drain on Shaw Blvd">
          <div className="grid gap-4">
            <StatusBadge status="in_progress" />
            <p className="text-muted">Complaint details, the timeline and actions appear here.</p>
          </div>
        </Drawer>
      </Demo>

      <Demo title="Tabs">
        <Tabs
          label="Complaint views"
          items={[
            { id: "list", label: "List", count: 28, content: <p className="text-muted">List of complaints.</p> },
            { id: "map", label: "Map", content: <p className="text-muted">Map of complaints.</p> },
            { id: "stats", label: "Analytics", content: <p className="text-muted">Charts and trends.</p> },
          ]}
        />
      </Demo>

      <Demo title="Loading">
        <div className="grid gap-4">
          <Spinner label="Loading complaints" />
          <div className="grid gap-2" aria-busy="true">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </Demo>

      <Demo title="Empty state">
        <EmptyState
          icon={<ClipboardList size={24} strokeWidth={1.75} />}
          title="No reports yet"
          description="When you report an issue, you can follow its progress here."
          action={<Button leadingIcon={<Camera {...icon} />}>Report an issue</Button>}
        />
      </Demo>

      <Demo title="Avatar">
        <div className="flex items-center gap-3">
          <Avatar name="Juan dela Cruz" size="sm" />
          <Avatar name="Maria Santos" />
          <Avatar name="Pasig Admin" size="lg" />
        </div>
      </Demo>
    </div>
  );
}
