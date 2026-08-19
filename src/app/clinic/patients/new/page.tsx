"use client";

import { useActionState } from "react";
import { createPatient, type CreatePatientState } from "@/lib/actions/patients";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const initialState: CreatePatientState = { error: null };

export default function NewPatientPage() {
  const [state, formAction, pending] = useActionState(
    createPatient,
    initialState
  );

  return (
    <div>
      <PageHeader title="Add Patient" description="Register a new patient." />
      <Card className="max-w-xl">
        <CardContent className="pt-6">
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Patient name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="whatsapp_number">WhatsApp number</Label>
              <Input id="whatsapp_number" name="whatsapp_number" type="tel" required />
            </div>
            {state.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            <Button type="submit" disabled={pending} className="mt-2 w-fit">
              {pending ? "Adding..." : "Add Patient"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
