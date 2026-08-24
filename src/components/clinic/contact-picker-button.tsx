"use client";

import { useState, useSyncExternalStore } from "react";
import { Contact } from "lucide-react";

type ContactsManager = {
  select: (
    properties: string[],
    options?: { multiple?: boolean }
  ) => Promise<{ name?: string[]; tel?: string[] }[]>;
};

function noopSubscribe() {
  return () => {};
}

// The Contact Picker API only exists on Chrome/Edge for Android -- it's
// not in TypeScript's lib.dom types and not available on desktop or iOS,
// so this button feature-detects and simply doesn't render anywhere else.
export function ContactPickerButton({
  onPick,
}: {
  onPick: (contact: { name: string; tel: string }) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const supported = useSyncExternalStore(
    noopSubscribe,
    () => "contacts" in navigator && "ContactsManager" in window,
    () => false
  );

  if (!supported) return null;

  async function handlePick() {
    setError(null);
    try {
      const contactsManager = (navigator as unknown as { contacts: ContactsManager }).contacts;
      const selected = await contactsManager.select(["name", "tel"], { multiple: false });
      const contact = selected[0];
      if (!contact) return;

      onPick({
        name: contact.name?.[0] ?? "",
        tel: contact.tel?.[0] ?? "",
      });
    } catch {
      setError("Couldn't access contacts. You can still enter details manually.");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handlePick}
        className="inline-flex w-fit items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
      >
        <Contact className="size-3.5" />
        Import from contacts
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
