"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, CheckCircle2 } from "lucide-react";
import { requestAppointment } from "@/lib/actions/follow-ups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const TIME_SLOTS = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
];

export function BookAppointmentDialog({ followUpId }: { followUpId: string }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setSuccess(false);
          setError(null);
        }
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <CalendarPlus className="h-3.5 w-3.5" />
        Book Appointment
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book Appointment</DialogTitle>
          <DialogDescription>
            Record the date and time you agreed on with the patient.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <p className="text-sm">Appointment request saved.</p>
            <DialogClose render={<Button />}>Done</DialogClose>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!date || !time) {
                setError("Pick both a date and a time.");
                return;
              }
              setError(null);
              startTransition(async () => {
                const result = await requestAppointment(followUpId, date, time);
                if (result.error) setError(result.error);
                else setSuccess(true);
              });
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="preferred-date">Preferred date</Label>
              <Input
                id="preferred-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Available time</Label>
              <Select value={time} onValueChange={(v) => setTime(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{() => time || "Select a time"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? "Saving..." : "Request Appointment"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
