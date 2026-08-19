import { MessageSquare } from "lucide-react";

export default function ClinicInboxIndexPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
      <MessageSquare className="h-8 w-8" />
      <p className="text-sm">Select a conversation to view messages.</p>
    </div>
  );
}
