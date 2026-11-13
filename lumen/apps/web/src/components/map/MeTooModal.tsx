"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HandHeart } from "lucide-react";
import { PinMap } from "@/components/map/PinMap";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { complaintService } from "@/lib/api";
import { errorMessage } from "@/lib/api/errors";
import { DUPLICATE_RULES, type Complaint, type Pin } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";

/**
 * Me Too from the map. The backend accepts a support only when the resident's pin is
 * within 50 m of the report, so we ask where they saw it, starting at the report's spot.
 */
export function MeTooModal({ complaint, onClose }: { complaint: Complaint; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [pin, setPin] = useState<Pin>({ latitude: complaint.latitude, longitude: complaint.longitude });
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () => complaintService.support(complaint.id, { ...pin, note: note.trim() || null, reporter_contact: user?.email ?? null }),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["complaints"] });
      await queryClient.invalidateQueries({ queryKey: ["complaint", complaint.id] });
      toast.show({ tone: "success", title: "Your Me Too was added", description: `${updated.report_count} residents have now reported this.` });
      onClose();
    },
  });

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Add your Me Too"
      description={complaint.title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" loading={mutation.isPending} leadingIcon={<HandHeart aria-hidden size={18} strokeWidth={1.75} />} onClick={() => mutation.mutate()}>
            Me Too
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <p className="text-sm text-muted">
          Where did you see it? Move the pin if needed. It must be within {DUPLICATE_RULES.radiusM} m of the report.
        </p>
        <div className="h-64 overflow-hidden rounded-card border border-border">
          <PinMap value={pin} onChange={setPin} focusKey={0} label="Where you saw the problem" />
        </div>
        <Field label="Anything to add?" hint="Optional">
          <Textarea rows={2} maxLength={500} showCount value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. It got worse after last night's rain." />
        </Field>
        {mutation.isError && <Alert tone="danger" title="Couldn't add your Me Too">{errorMessage(mutation.error)}</Alert>}
      </div>
    </Modal>
  );
}
