"use client";

import { useActionState, useRef } from "react";
import { Send } from "lucide-react";
import { sendMessage, type SendMessageState } from "@/lib/actions/messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: SendMessageState = { error: null };

export function SendMessageForm({ conversationId }: { conversationId: string }) {
  const boundAction = sendMessage.bind(null, conversationId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="border-t p-3">
      {state.error && (
        <p className="mb-2 text-sm text-destructive">{state.error}</p>
      )}
      <form
        ref={formRef}
        action={(formData) => {
          formAction(formData);
          formRef.current?.reset();
        }}
        className="flex items-center gap-2"
      >
        <Input
          name="body"
          placeholder="Type a message..."
          autoComplete="off"
          required
          disabled={pending}
        />
        <Button type="submit" disabled={pending} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
