import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Clinic } from "@/lib/types";

export default async function AgencyClinicsPage() {
  const supabase = await createClient();
  const { data: clinics } = await supabase
    .from("clinics")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Clinic[]>();

  return (
    <div>
      <PageHeader
        title="Clinics"
        description="Add and manage clinics on the platform."
        action={
          <Button nativeButton={false} render={<Link href="/agency/clinics/new" />}>
            <Plus className="h-4 w-4" />
            Add Clinic
          </Button>
        }
      />

      {!clinics || clinics.length === 0 ? (
        <ComingSoon
          icon={Building2}
          title="No clinics yet"
          milestone='Click "Add Clinic" to create your first one.'
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>WhatsApp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clinics.map((clinic) => (
                  <TableRow key={clinic.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/agency/clinics/${clinic.id}`}
                        className="hover:underline"
                      >
                        {clinic.name}
                      </Link>
                    </TableCell>
                    <TableCell>{clinic.city ?? "—"}</TableCell>
                    <TableCell>{clinic.phone ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          clinic.whatsapp_status === "connected"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {clinic.whatsapp_status === "connected"
                          ? "Connected"
                          : "Not Connected"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
