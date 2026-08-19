"use client";

import { useActionState } from "react";
import { createClinic, type CreateClinicState } from "@/lib/actions/clinics";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const initialState: CreateClinicState = { error: null };

export default function NewClinicPage() {
  const [state, formAction, pending] = useActionState(
    createClinic,
    initialState
  );

  return (
    <div>
      <PageHeader title="Add Clinic" description="Register a new clinic." />
      <Card className="max-w-xl">
        <CardContent className="pt-6">
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Clinic name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="doctor_name">Doctor name</Label>
              <Input id="doctor_name" name="doctor_name" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="whatsapp_number">WhatsApp number</Label>
              <Input id="whatsapp_number" name="whatsapp_number" type="tel" />
            </div>
            {state.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            <Button type="submit" disabled={pending} className="mt-2 w-fit">
              {pending ? "Creating..." : "Create Clinic"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
