import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { SendMessageForm } from "@/components/clinic/send-message-form";
import { HumanAttentionToggle } from "@/components/clinic/human-attention-toggle";
import { MarkRead } from "@/components/clinic/mark-read";
import { Badge } from "@/components/ui/badge";
import type { Conversation, Message, Patient } from "@/lib/types";

const statusLabel: Record<Message["status"], string> = {
  queued: "Queued",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Failed",
};

export default async function ConversationThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .single<Conversation>();

  if (!conversation) notFound();

  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", conversation.patient_id)
    .single<Patient>();

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .returns<Message[]>();

  return (
    <>
      <MarkRead conversationId={id} />
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <Link
          href={`/clinic/patients/${conversation.patient_id}`}
          className="font-medium hover:underline"
        >
          {patient?.name ?? "Unknown"}
        </Link>
        <HumanAttentionToggle
          conversationId={id}
          active={conversation.human_attention}
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {!messages || messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex flex-col gap-1",
                message.direction === "outbound" ? "items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                  message.direction === "outbound"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {message.body}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {message.direction === "outbound" && (
                  <Badge variant="outline" className="h-4 px-1 text-[10px]">
                    {statusLabel[message.status]}
                  </Badge>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <SendMessageForm conversationId={id} />
    </>
  );
}
