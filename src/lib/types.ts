export type UserRole = "agency_admin" | "clinic_admin" | "receptionist";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  clinic_id: string | null;
  created_at: string;
};

export type WhatsappStatus = "not_connected" | "connected";

export type Clinic = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  whatsapp_number: string | null;
  whatsapp_status: WhatsappStatus;
  whatsapp_last_checked_at: string | null;
  created_by: string;
  created_at: string;
};

export type Doctor = {
  id: string;
  clinic_id: string;
  name: string;
  created_at: string;
};

export type Patient = {
  id: string;
  clinic_id: string;
  name: string;
  whatsapp_number: string;
  created_at: string;
};

export type Conversation = {
  id: string;
  clinic_id: string;
  patient_id: string;
  last_message_at: string;
  unread_count: number;
  human_attention: boolean;
  created_at: string;
};

export type MessageDirection = "inbound" | "outbound";
export type MessageStatus = "queued" | "sent" | "delivered" | "read" | "failed";

export type Message = {
  id: string;
  conversation_id: string;
  clinic_id: string;
  patient_id: string;
  direction: MessageDirection;
  body: string;
  provider_message_id: string | null;
  status: MessageStatus;
  created_at: string;
};
