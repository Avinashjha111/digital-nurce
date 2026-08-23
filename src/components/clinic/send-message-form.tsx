"use client";

import { useActionState, useRef } from "react";
import { Send } from "lucide-react";
import { sendMessage, type SendMessageState } from "@/lib/actions/messages";

const initialState: SendMessageState = { error: null };

export function SendMessageForm({ conversationId }: { conversationId: string }) {
  const boundAction = sendMessage.bind(null, conversationId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="shrink-0 bg-[#F0F2F5] px-2 py-2 sm:px-4">
      {state.error && (
        <p className="mb-1 px-2 text-xs text-destructive">{state.error}</p>
      )}
      <form
        ref={formRef}
        action={(formData) => {
          formAction(formData);
          formRef.current?.reset();
        }}
        className="flex items-center gap-2"
      >
        <input
          name="body"
          placeholder="Type a message"
          autoComplete="off"
          required
          disabled={pending}
          className="h-10 flex-1 rounded-full border-none bg-white px-4 text-sm text-[#111B21] shadow-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Send message"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#00A884] text-white transition-colors hover:bg-[#029273] disabled:opacity-60"
        >
          <Send className="size-4.5" />
        </button>
      </form>
    </div>
  );
}
