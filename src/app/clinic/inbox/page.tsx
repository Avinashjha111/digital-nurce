import { Inbox } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";

export default function ClinicInboxPage() {
  return (
    <div>
      <PageHeader title="Inbox" description="WhatsApp conversations with your patients." />
      <ComingSoon
        icon={Inbox}
        title="WhatsApp inbox lands in Milestone 4"
        milestone="Send/receive messages, delivery status and human attention flags."
      />
    </div>
  );
}
