import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Conversation, Message, Patient } from "@/lib/types";

type ConversationRow = Conversation & { patients: Pick<Patient, "name"> | null };

async function getConversationPreviews() {
  const supabase = await createClient();

  const { data: conversations } = await supabase
    .from("conversations")
    .select("*, patients(name)")
    .order("last_message_at", { ascending: false })
    .returns<ConversationRow[]>();

  if (!conversations || conversations.length === 0) return [];

  const previews = await Promise.all(
    conversations.map(async (conversation) => {
      const { data: lastMessage } = await supabase
        .from("messages")
        .select("body, created_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<Pick<Message, "body" | "created_at">>();

      return { conversation, lastMessage };
    })
  );

  return previews;
}

export default async function ClinicInboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const previews = await getConversationPreviews();

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-0 overflow-hidden rounded-lg border bg-background">
      <aside className="flex w-full max-w-xs shrink-0 flex-col overflow-y-auto border-r">
        {previews.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No conversations yet. They appear here once a patient messages
            your clinic on WhatsApp.
          </p>
        ) : (
          previews.map(({ conversation, lastMessage }) => (
            <Link
              key={conversation.id}
              href={`/clinic/inbox/${conversation.id}`}
              className="flex flex-col gap-1 border-b px-4 py-3 hover:bg-muted/50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">
                  {conversation.patients?.name ?? "Unknown"}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(conversation.last_message_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm text-muted-foreground">
                  {lastMessage?.body ?? "—"}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  {conversation.human_attention && (
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  )}
                  {conversation.unread_count > 0 && (
                    <Badge
                      className={cn(
                        "h-5 min-w-5 justify-center rounded-full px-1.5"
                      )}
                    >
                      {conversation.unread_count}
                    </Badge>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
