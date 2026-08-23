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
  reminder_template_id: string | null;
  follow_up_template_id: string | null;
  google_maps_link: string | null;
  email: string | null;
  opening_days: string[] | null;
  opening_time: string | null;
  closing_time: string | null;
  break_start_time: string | null;
  break_end_time: string | null;
  weekly_off: string[] | null;
  emergency_instructions: string | null;
  appointment_process: string | null;
  consultation_fee: number | null;
  follow_up_fee: number | null;
  payment_methods: string[] | null;
  services: string[] | null;
  departments: string[] | null;
  created_by: string;
  created_at: string;
};

export type Doctor = {
  id: string;
  clinic_id: string;
  name: string;
  specialization: string | null;
  experience_years: number | null;
  bio: string | null;
  consultation_fee: number | null;
  consultation_days: string[] | null;
  morning_start: string | null;
  morning_end: string | null;
  evening_start: string | null;
  evening_end: string | null;
  services: string[] | null;
  created_at: string;
};

export type ClinicFaq = {
  id: string;
  clinic_id: string;
  question: string;
  answer: string;
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

export type ReminderStatus =
  | "scheduled"
  | "processing"
  | "sent"
  | "delivered"
  | "failed"
  | "cancelled"
  | "skipped";

export type Reminder = {
  id: string;
  clinic_id: string;
  patient_id: string;
  prescription_id: string;
  medicine_id: string;
  scheduled_at: string;
  status: ReminderStatus;
  provider_message_id: string | null;
  error: string | null;
  created_at: string;
};

export type FollowUpStatus =
  | "upcoming"
  | "due"
  | "contacted"
  | "appointment_requested"
  | "completed"
  | "overdue"
  | "cancelled";

export type FollowUp = {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string;
  prescription_id: string;
  follow_up_date: string;
  status: FollowUpStatus;
  message_sent_at: string | null;
  provider_message_id: string | null;
  error: string | null;
  created_at: string;
};

export type AppointmentRequestStatus = "requested" | "confirmed" | "cancelled";

export type AppointmentRequest = {
  id: string;
  clinic_id: string;
  patient_id: string;
  follow_up_id: string;
  preferred_date: string;
  preferred_time: string;
  status: AppointmentRequestStatus;
  created_at: string;
};
