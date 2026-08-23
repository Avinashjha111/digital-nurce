import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { WhatsAppAvatar } from "@/components/clinic/whatsapp-avatar";
import { InboxShell } from "@/components/clinic/inbox-shell";
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

  const list = (
    <>
      <div className="shrink-0 border-b bg-background px-4 py-3">
        <h1 className="text-base font-semibold">Chats</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
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
              className="flex items-center gap-3 border-b px-3 py-2.5 hover:bg-muted/50"
            >
              <WhatsAppAvatar name={conversation.patients?.name ?? "?"} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
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
                  <span className="truncate text-xs text-muted-foreground">
                    {lastMessage?.body ?? "—"}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    {conversation.human_attention && (
                      <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                    )}
                    {conversation.unread_count > 0 && (
                      <Badge
                        className={cn("h-5 min-w-5 justify-center rounded-full px-1.5")}
                      >
                        {conversation.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );

  return <InboxShell list={list} thread={children} />;
}
