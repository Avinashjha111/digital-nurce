"use client";

import { useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { connectWhatsApp, type ConnectWhatsAppState } from "@/lib/actions/whatsapp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const initialState: ConnectWhatsAppState = { error: null };

export function ConnectWhatsAppDialog({ clinicId }: { clinicId: string }) {
  const [open, setOpen] = useState(false);
  const boundAction = connectWhatsApp.bind(null, clinicId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
      <DialogTrigger render={<Button />}>Connect WhatsApp</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect WhatsApp</DialogTitle>
          <DialogDescription>
            Enter the Phone Number ID and access token from your Meta WhatsApp
            Cloud API test setup (developers.facebook.com). We verify them
            with Meta before saving.
          </DialogDescription>
        </DialogHeader>

        {state.success ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <p className="text-sm">WhatsApp connected successfully.</p>
            <DialogClose render={<Button />}>Done</DialogClose>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone_number_id">Phone Number ID</Label>
              <Input id="phone_number_id" name="phone_number_id" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="access_token">Access token</Label>
              <Input id="access_token" name="access_token" type="password" required />
            </div>
            {state.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? "Verifying..." : "Verify & Connect"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
