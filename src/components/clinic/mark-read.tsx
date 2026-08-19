"use client";

import { useEffect } from "react";
import { markConversationRead } from "@/lib/actions/messages";

export function MarkRead({ conversationId }: { conversationId: string }) {
  useEffect(() => {
    markConversationRead(conversationId);
  }, [conversationId]);

  return null;
}
