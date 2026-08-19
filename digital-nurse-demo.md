# Digital Nurse — Demo MVP Specification

## Goal

Build a REAL working demo of **Digital Nurse**, not a fake UI.

The demo proves this core journey:

Agency Dashboard
→ Add Clinic
→ Connect WhatsApp
→ WhatsApp send/receive
→ Patient
→ Prescription Upload
→ Gemini AI Extraction
→ Human Approval
→ Reminder Schedule
→ WhatsApp Reminder
→ Patient Reply
→ Follow-up

This is only the demo/MVP foundation. Do not build hospital management or unrelated features.

## Product

Digital Nurse is a clinic-focused patient communication and follow-up system.

The patient uses WhatsApp. The clinic uses our responsive web app. The agency manages clinics from the Agency Dashboard.

## Technology

- Next.js + TypeScript
- Tailwind CSS + shadcn/ui
- Vercel
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Google Gemini API for prescription extraction
- WhatsApp provider integration (Twilio for the production architecture; testing environment may be used during development)

Create an internal AI abstraction such as `aiService.extractPrescription()` so the provider can be changed later.

## 1. Agency Dashboard

Navigation:

- Dashboard
- Clinics
- Patients
- Prescriptions
- Reminders
- Follow-ups
- Conversations
- Settings

### Dashboard

Show:

- Total clinics
- Total patients
- Prescriptions awaiting review
- Active reminders
- Failed reminders
- Follow-ups due
- WhatsApp connection status

### Add Clinic

Fields:

- Clinic name
- Doctor name
- Phone
- Address
- City
- WhatsApp number

After creation, show the clinic details and a **Connect WhatsApp** button.

## 2. WhatsApp Connection

Production flow:

Connect WhatsApp
→ Meta Embedded Signup
→ Clinic authorizes its WhatsApp Business assets/number
→ Backend receives onboarding information
→ Provider sender is connected
→ Status becomes Connected

The frontend must never expose provider credentials or Meta secrets.

During development, use the configured WhatsApp testing environment if production onboarding is not yet available.

Clinic page should show:

- Connected / Not Connected
- WhatsApp number
- Provider status
- Last connection check

## 3. WhatsApp Send + Receive

This is mandatory.

### Incoming

Patient
→ WhatsApp
→ Provider
→ `POST /api/webhooks/whatsapp`
→ Backend
→ Supabase
→ Inbox

Save:

- clinic_id
- patient_id
- conversation_id
- direction
- message
- provider_message_id
- status
- timestamp

### Outgoing

Agency/Clinic user
→ Backend
→ Provider WhatsApp API
→ Patient WhatsApp

Save outgoing message and provider ID.

Support status where available:

- queued
- sent
- delivered
- read
- failed

Create a separate status webhook, e.g.:
`POST /api/webhooks/whatsapp/status`

Validate webhook requests server-side.

## 4. Conversation Inbox

WhatsApp-style inbox.

Left:

- Patient name
- Last message
- Time
- Unread count

Right:

- Conversation
- Incoming/outgoing messages
- Timestamp
- Delivery status
- Human attention indicator

Input:

`Type a message...`

Button:

`Send`

## 5. Patients

Patient fields:

- ID
- Name
- WhatsApp number
- Clinic
- Created date

Patient profile:

- Basic details
- Conversation history
- Prescriptions
- Reminders
- Follow-ups

Keep this simple; it is not an EMR.

## 6. Prescription Upload

User flow:

Select Patient
→ Select Doctor
→ Upload prescription
→ Supabase Storage
→ Create prescription record
→ Gemini extraction

Support:

- JPG
- JPEG
- PNG
- PDF

Prescription statuses:

- Uploaded
- Processing
- Review Required
- Approved
- Rejected
- Failed

## 7. Gemini Prescription Extraction

Gemini must extract ONLY information visible/clear in the prescription.

Extract:

### Patient

- Patient name

### Medicines

For each medicine:

- Name
- Dosage
- Frequency
- Duration
- Timing if explicitly written
- Explicit instructions

### Follow-up

If explicitly written:

- Required
- Date/interval
- Instruction

If unclear, return `Needs Review`. Never guess.

Use structured JSON, for example:

```json
{
  "patient_name": "Rahul Kumar",
  "medicines": [
    {
      "name": "Medicine A",
      "dosage": "1 tablet",
      "frequency": "3 times daily",
      "duration_days": 5,
      "timings": ["08:00", "14:00", "20:00"],
      "instruction": "After food"
    }
  ],
  "follow_up": {
    "required": true,
    "days_after": 7
  }
}
```

Validate the AI output before using it.

## 8. Human Approval

NEVER send reminders directly from raw AI output.

Review screen:

LEFT:
- Original prescription

RIGHT:
- Extracted patient
- Medicines
- Dosage
- Frequency
- Duration
- Timing
- Instructions
- Follow-up

Actions:

- Approve
- Edit
- Reject
- Reprocess if extraction failed

Only approved data can create reminders.

## 9. Medical Safety

Digital Nurse is NOT a doctor.

AI must NOT:

- Diagnose
- Recommend new medicine
- Change dosage
- Change frequency
- Stop medicine
- Create treatment plans
- Invent prescription instructions
- Give independent medical advice

Its role is:

> Extract doctor-written instructions → human verification → reminder.

If information is unclear, require human review.

If a patient reports a medical problem, mark the conversation **Human Attention Required**.

## 10. Reminder Schedule

After approval, create schedules from approved prescription data.

Example:

Medicine A
1 tablet
3 times daily
5 days

Schedule:

08:00
14:00
20:00

for 5 days.

Each reminder contains:

- patient_id
- prescription_id
- medicine_id
- scheduled_at
- status

Statuses:

- scheduled
- processing
- sent
- delivered
- failed
- cancelled
- skipped

The scheduler must be idempotent and must not create duplicate sends.

## 11. WhatsApp Reminder

At the scheduled time:

Reminder
→ Backend scheduler
→ WhatsApp provider
→ Patient

Example:

> Rahul ji, doctor ki approved prescription instructions ke according aapki medicine ka scheduled reminder hai.

If dosage/timing is shown, it must come ONLY from approved prescription data.

Log:

- reminder ID
- patient
- prescription
- provider message ID
- timestamp
- status
- error if failed

## 12. Patient Reply

Store replies in the inbox.

Examples:

- `Le li`
- `Okay`
- `Maine nahi li`

For medical complaints or requests for medical advice:

`Human Attention Required`

Do not let AI independently diagnose or treat.

## 13. Follow-up Prototype

If the approved prescription says:

`Follow-up after 7 days`

create:

- follow-up date
- patient
- doctor
- prescription
- status

Statuses:

- Upcoming
- Due
- Contacted
- Appointment Requested
- Completed
- Overdue
- Cancelled

When due, send an approved follow-up message.

Example:

> Rahul ji, doctor ne aapke follow-up ke liye visit recommend kiya tha. Kya aap appointment book karna chahenge?

CTA:

`Book Appointment`

## 14. Basic Appointment Request

Only build enough to prove the follow-up journey:

Follow-up
→ Book Appointment
→ Select preferred date
→ Select available time
→ Appointment Request

Do NOT build a complete hospital scheduling system.

## 15. Clinic Web App

Responsive web app/PWA, not native Android/iOS.

Navigation:

- Dashboard
- Patients
- Prescriptions
- Reminders
- Follow-ups
- Inbox

Clinic users can:

- View patients
- Upload prescriptions
- Review/edit/approve extraction
- View reminders
- View follow-ups
- View appointments
- Handle important conversations

## 16. Roles

Use Supabase Auth.

Roles:

- agency_admin
- clinic_admin
- receptionist

Agency users can manage clinics.

Clinic users can only access their own clinic data.

Tenant isolation must be enforced in backend/database, not only hidden in the frontend.

## 17. Minimum Database Entities

Create only what this demo needs:

- users
- clinics
- doctors
- patients
- prescriptions
- prescription_medicines
- medication_schedules
- reminders
- follow_ups
- appointments
- conversations
- messages
- automation_runs

## 18. Security

Never expose in frontend:

- Gemini API key
- Twilio/provider auth credentials
- Supabase service-role key
- Meta access tokens
- webhook secrets

Use server-side environment variables.

Use authentication, authorization, HTTPS, webhook validation and appropriate Supabase RLS.

Create `.env.example`; never commit `.env`.

## 19. UI Style

Professional healthcare SaaS.

Use:

- Clean layout
- Clear cards
- Simple tables
- Status badges
- Readable typography
- Obvious primary buttons

Important buttons:

- Connect WhatsApp
- Upload Prescription
- Review Prescription
- Approve
- Send Message
- View Reminder

Avoid excessive animations, gradients and clutter.

## 20. Demo Completion Criteria

The demo is complete only when this works end-to-end:

1. Agency creates clinic.
2. Clinic WhatsApp connection state works.
3. Patient sends WhatsApp message.
4. Backend receives it.
5. Message appears in inbox.
6. Agency/clinic replies.
7. Patient receives reply.
8. Patient is created.
9. Prescription is uploaded.
10. File is stored.
11. Gemini extracts structured information.
12. Human reviews it.
13. Human approves it.
14. Reminder schedule is created.
15. Scheduler finds a due reminder.
16. WhatsApp reminder is sent.
17. Patient reply is stored.
18. Follow-up is created.
19. Follow-up message can be triggered.
20. Basic appointment request can be created.
21. Agency can monitor the entire journey.

## 21. Vibe Coding Rules

Do NOT ask an AI coding assistant to build everything in one prompt.

Build milestone by milestone:

### Milestone 1
Next.js + Supabase + Auth + layouts.

### Milestone 2
Agency login + clinic creation.

### Milestone 3
Clinic web app + patients.

### Milestone 4
WhatsApp send/receive + webhooks + message statuses.

### Milestone 5
Prescription upload + Storage.

### Milestone 6
Gemini extraction + structured JSON.

### Milestone 7
Human review + approve/edit/reject.

### Milestone 8
Reminder schedule + scheduler + WhatsApp reminder.

### Milestone 9
Follow-up + basic appointment request.

After every milestone:

1. Run the app.
2. Test.
3. Fix errors.
4. Commit to Git.
5. Continue.

Do not add unrelated features.

## 22. Out of Scope

Do NOT build now:

- Hospital management
- IPD/ward management
- Pharmacy
- Inventory
- Lab
- Billing
- Insurance
- HR/payroll
- Native mobile apps
- Advanced marketing campaigns
- Social media management
- Advanced analytics
- AI diagnosis
- AI treatment recommendation
- AI prescription generation
- Automatic prescription modification

## Final Rule

The core proof of Digital Nurse is:

```text
Agency Dashboard
      ↓
Add Clinic
      ↓
Connect WhatsApp
      ↓
WhatsApp Send + Receive
      ↓
Patient
      ↓
Prescription Upload
      ↓
Gemini AI
      ↓
Prescription Extract
      ↓
Human Approval
      ↓
Reminder Schedule
      ↓
WhatsApp Reminder
      ↓
Patient Reply
      ↓
Follow-up
      ↓
Basic Appointment Request
```

Do not consider the demo complete until this flow works with real backend data and real API communication rather than mock screens.
