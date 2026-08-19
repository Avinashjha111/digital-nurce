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
