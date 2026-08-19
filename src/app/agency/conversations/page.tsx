import { MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";

export default function AgencyConversationsPage() {
  return (
    <div>
      <PageHeader
        title="Conversations"
        description="WhatsApp conversations across all clinics."
      />
      <ComingSoon
        icon={MessageSquare}
        title="WhatsApp inbox lands in Milestone 4"
        milestone="Send/receive messages, delivery status and human attention flags."
      />
    </div>
  );
}
