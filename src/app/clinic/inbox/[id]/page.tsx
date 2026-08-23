import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { dateSeparatorLabel } from "@/lib/date-separator";
import { chatThemeBackground } from "@/lib/chat-theme";
import { SendMessageForm } from "@/components/clinic/send-message-form";
import { ServiceWindowLocked } from "@/components/clinic/service-window-locked";
import { HumanAttentionToggle } from "@/components/clinic/human-attention-toggle";
import { ChatAppearanceDialog } from "@/components/clinic/chat-appearance-dialog";
import { MarkRead } from "@/components/clinic/mark-read";
import { WhatsAppAvatar } from "@/components/clinic/whatsapp-avatar";
import { MessageStatusTicks } from "@/components/clinic/message-status-ticks";
import type { ClinicChatAppearance, Conversation, Message, Patient } from "@/lib/types";

const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

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

  const { data: appearance } = await supabase
    .from("clinic_chat_appearance")
    .select("*")
    .eq("clinic_id", conversation.clinic_id)
    .maybeSingle<ClinicChatAppearance>();

  const wallpaperUrl = appearance?.wallpaper_url ?? null;
  const chatBackgroundStyle = wallpaperUrl
    ? {
        backgroundImage: `linear-gradient(rgba(255,255,255,0.45), rgba(255,255,255,0.45)), url(${wallpaperUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { backgroundColor: chatThemeBackground(appearance?.theme) };

  // WhatsApp's 24h customer-service window: free-text replies are only
  // allowed within 24h of the patient's most recent inbound message.
  // Outbound sends (including templates) never open or extend it -- only
  // the patient messaging in does.
  const lastInboundAt = [...(messages ?? [])]
    .reverse()
    .find((m) => m.direction === "inbound")?.created_at;
  const isWindowOpen = lastInboundAt
    ? new Date().getTime() - new Date(lastInboundAt).getTime() < SERVICE_WINDOW_MS
    : false;

  const patientName = patient?.name ?? "Unknown";

  let lastDateLabel: string | null = null;

  return (
    <>
      <MarkRead conversationId={id} />

      {/* Real WhatsApp header: teal, avatar + name, back arrow on mobile
          only (desktop always shows the list alongside). */}
      <div className="flex shrink-0 items-center gap-2 bg-[#008069] px-3 py-2.5 text-white">
        <Link
          href="/clinic/inbox"
          className="rounded-full p-1 hover:bg-white/10 md:hidden"
          aria-label="Back to chats"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <Link
          href={`/clinic/patients/${conversation.patient_id}`}
          className="flex min-w-0 flex-1 items-center gap-2.5"
        >
          <WhatsAppAvatar name={patientName} tone="light" />
          <span className="truncate font-medium">{patientName}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <HumanAttentionToggle conversationId={id} active={conversation.human_attention} />
          <ChatAppearanceDialog
            clinicId={conversation.clinic_id}
            theme={appearance?.theme ?? "default"}
            wallpaperUrl={wallpaperUrl}
          />
        </div>
      </div>

      {/* Clinic-chosen theme color or custom wallpaper photo, like real
          WhatsApp's own chat-background picker. */}
      <div
        className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3 sm:px-6"
        style={chatBackgroundStyle}
      >
        {!messages || messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          messages.map((message) => {
            const label = dateSeparatorLabel(message.created_at);
            const showSeparator = label !== lastDateLabel;
            lastDateLabel = label;

            return (
              <div key={message.id} className="flex flex-col gap-1">
                {showSeparator && (
                  <div className="my-2 flex justify-center">
                    <span className="rounded-md bg-white/70 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
                      {label}
                    </span>
                  </div>
                )}
                <div
                  className={cn(
                    "flex",
                    message.direction === "outbound" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "flex max-w-[85%] flex-col gap-0.5 rounded-lg px-2.5 py-1.5 shadow-sm sm:max-w-[65%]",
                      message.direction === "outbound"
                        ? "rounded-tr-none bg-[#D9FDD3]"
                        : "rounded-tl-none bg-white"
                    )}
                  >
                    <p className="text-sm break-words text-[#111B21]">{message.body}</p>
                    <div className="flex items-center justify-end gap-1 self-end">
                      <span className="text-[10px] text-black/45">
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {message.direction === "outbound" && (
                        <MessageStatusTicks status={message.status} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isWindowOpen ? (
        <SendMessageForm conversationId={id} />
      ) : (
        <ServiceWindowLocked patientId={conversation.patient_id} />
      )}
    </>
  );
}
