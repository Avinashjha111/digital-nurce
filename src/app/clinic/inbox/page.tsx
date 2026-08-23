import { MessageSquare } from "lucide-react";

export default function ClinicInboxIndexPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[#F0F2F5] p-6 text-center text-muted-foreground">
      <div className="flex size-16 items-center justify-center rounded-full bg-white">
        <MessageSquare className="size-7 text-[#00A884]" />
      </div>
      <p className="text-sm">Select a conversation to view messages.</p>
    </div>
  );
}
