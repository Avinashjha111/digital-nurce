"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deletePatient } from "@/lib/actions/patients";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Agency-only, permanent -- deletes the patient and (via DB cascade)
// every conversation, message, prescription, reminder and follow-up tied
// to them. `redirectAfter` is only passed from the patient's own detail
// page (nothing left to show there once it's gone); on the list, the
// server action's revalidatePath is enough -- the row just disappears.
export function DeletePatientDialog({
  patientId,
  patientName,
  redirectAfter,
}: {
  patientId: string;
  patientName: string;
  redirectAfter?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deletePatient(patientId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      if (redirectAfter) router.push(redirectAfter);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>
        <Trash2 className="size-4" />
        Delete
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {patientName}?</DialogTitle>
          <DialogDescription>
            This permanently deletes {patientName}&apos;s record and all their
            conversations, messages, prescriptions, reminders and follow-ups
            across every dashboard. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button variant="destructive" disabled={pending} onClick={handleDelete}>
            {pending ? "Deleting..." : "Delete Permanently"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
