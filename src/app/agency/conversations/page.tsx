import { MessageSquare, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ConversationRow = {
  id: string;
  last_message_at: string;
  unread_count: number;
  human_attention: boolean;
  clinics: { name: string } | null;
  patients: { name: string } | null;
};

export default async function AgencyConversationsPage() {
  const supabase = await createClient();
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, last_message_at, unread_count, human_attention, clinics(name), patients(name)")
    .order("last_message_at", { ascending: false })
    .returns<ConversationRow[]>();

  return (
    <div>
      <PageHeader
        title="Conversations"
        description="WhatsApp conversations across all clinics."
      />

      {!conversations || conversations.length === 0 ? (
        <ComingSoon
          icon={MessageSquare}
          title="No conversations yet"
          milestone="Conversations appear here once patients message a connected clinic."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Clinic</TableHead>
                  <TableHead>Last message</TableHead>
                  <TableHead>Unread</TableHead>
                  <TableHead>Attention</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversations.map((conversation) => (
                  <TableRow key={conversation.id}>
                    <TableCell className="font-medium">
                      {conversation.patients?.name ?? "Unknown"}
                    </TableCell>
                    <TableCell>{conversation.clinics?.name ?? "—"}</TableCell>
                    <TableCell>
                      {new Date(conversation.last_message_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {conversation.unread_count > 0 ? (
                        <Badge>{conversation.unread_count}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {conversation.human_attention && (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
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
