import { notFound } from "next/navigation";
import Link from "next/link";
import {
  User,
  MessageSquare,
  FileText,
  Bell,
  CalendarClock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PrescriptionStatusBadge } from "@/components/prescription-status-badge";
import type { Conversation, Patient, Prescription } from "@/lib/types";

export default async function ClinicPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .single<Patient>();

  if (!patient) notFound();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("patient_id", id)
    .maybeSingle<Conversation>();

  const { data: prescriptions } = await supabase
    .from("prescriptions")
    .select("*")
    .eq("patient_id", id)
    .order("created_at", { ascending: false })
    .returns<Prescription[]>();

  return (
    <div>
      <PageHeader title={patient.name} description="Patient profile." />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Basic Details
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <Row label="WhatsApp number" value={`+${patient.whatsapp_number}`} />
            <Row
              label="Registered"
              value={new Date(patient.created_at).toLocaleDateString()}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Conversation History
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            {conversation ? (
              <Button
                size="sm"
                nativeButton={false}
                render={<Link href={`/clinic/inbox/${conversation.id}`} />}
              >
                Open Conversation
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                No WhatsApp messages with this patient yet. Your agency can
                reach out with a template message to start one.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Prescriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!prescriptions || prescriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No prescriptions uploaded yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {prescriptions.map((prescription) => (
                  <li key={prescription.id}>
                    <Link
                      href={`/clinic/prescriptions/${prescription.id}`}
                      className="flex items-center justify-between gap-2 text-sm hover:underline"
                    >
                      <span>
                        {new Date(prescription.created_at).toLocaleDateString()}
                      </span>
                      <PrescriptionStatusBadge status={prescription.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <StubSection
          icon={Bell}
          title="Reminders"
          milestone="Medicine reminders land in Milestone 8."
        />
        <StubSection
          icon={CalendarClock}
          title="Follow-ups"
          milestone="Follow-ups and appointment requests land in Milestone 9."
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function StubSection({
  icon: Icon,
  title,
  milestone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  milestone: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{milestone}</p>
      </CardContent>
    </Card>
  );
}
