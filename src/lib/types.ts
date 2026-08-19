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

export type PrescriptionStatus =
  | "uploaded"
  | "processing"
  | "review_required"
  | "approved"
  | "rejected"
  | "failed";

export type Prescription = {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string;
  file_path: string;
  file_type: string;
  status: PrescriptionStatus;
  uploaded_by: string;
  created_at: string;
  extracted_patient_name: string | null;
  patient_name_needs_review: boolean;
  follow_up_required: boolean | null;
  follow_up_days_after: number | null;
  follow_up_instruction: string | null;
  follow_up_needs_review: boolean;
  extraction_error: string | null;
};

export type PrescriptionMedicine = {
  id: string;
  prescription_id: string;
  clinic_id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  duration_days: number | null;
  timings: string[] | null;
  instruction: string | null;
  needs_review: boolean;
  created_at: string;
};

export type WhatsappTemplateStatus = "pending" | "approved" | "rejected" | "disabled";
export type WhatsappTemplateCategory = "utility" | "marketing" | "authentication";
export type WhatsappTemplateHeaderType =
  | "none"
  | "text"
  | "image"
  | "video"
  | "document"
  | "location";

export type WhatsappTemplateButton =
  | { type: "QUICK_REPLY"; text: string }
  | { type: "URL"; text: string; url: string }
  | { type: "PHONE_NUMBER"; text: string; phoneNumber: string }
  | { type: "COPY_CODE"; example: string };

export type WhatsappTemplate = {
  id: string;
  clinic_id: string;
  name: string;
  category: WhatsappTemplateCategory;
  language: string;
  body_text: string;
  header_type: WhatsappTemplateHeaderType;
  header_text: string | null;
  header_media_path: string | null;
  footer_text: string | null;
  buttons: WhatsappTemplateButton[];
  meta_template_id: string | null;
  status: WhatsappTemplateStatus;
  rejection_reason: string | null;
  created_by: string;
  created_at: string;
};
