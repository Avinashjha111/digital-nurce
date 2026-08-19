import { CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";

export default function AgencyFollowUpsPage() {
  return (
    <div>
      <PageHeader title="Follow-ups" description="Follow-ups due across clinics." />
      <ComingSoon
        icon={CalendarClock}
        title="Follow-up tracking lands in Milestone 9"
        milestone="Follow-up creation, due alerts and appointment requests."
      />
    </div>
  );
}
