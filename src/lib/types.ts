export type UserRole = "agency_admin" | "clinic_admin" | "receptionist";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  clinic_id: string | null;
  created_at: string;
};
