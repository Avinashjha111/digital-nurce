"use client";

import { useActionState, useState } from "react";
import { createPatient, type CreatePatientState } from "@/lib/actions/patients";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ContactPickerButton } from "@/components/clinic/contact-picker-button";
import { BulkImportPatients } from "@/components/clinic/bulk-import-patients";

const initialState: CreatePatientState = { error: null };

export default function NewPatientPage() {
  const [state, formAction, pending] = useActionState(
    createPatient,
    initialState
  );
  const [name, setName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  return (
    <div>
      <PageHeader title="Add Patient" description="Register a new patient." />
      <Card className="max-w-xl">
        <CardContent className="pt-6">
          <Tabs defaultValue="manual">
            <TabsList>
              <TabsTrigger value="manual">Add Manually</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Import (CSV)</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="mt-4">
              <form action={formAction} className="flex flex-col gap-4">
                <ContactPickerButton
                  onPick={(contact) => {
                    if (contact.name) setName(contact.name);
                    if (contact.tel) setWhatsappNumber(contact.tel);
                  }}
                />
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Patient name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="whatsapp_number">WhatsApp number</Label>
                  <Input
                    id="whatsapp_number"
                    name="whatsapp_number"
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    required
                  />
                </div>
                {state.error && (
                  <p className="text-sm text-destructive">{state.error}</p>
                )}
                <Button type="submit" disabled={pending} className="mt-2 w-fit">
                  {pending ? "Adding..." : "Add Patient"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="bulk" className="mt-4">
              <BulkImportPatients />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
