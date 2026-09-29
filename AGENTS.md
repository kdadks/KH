# AGENTS.md - Instructions for AI Coding Agents

> **IMPORTANT**: This repository contains strict architectural patterns, security controls (GDPR/PII encryption), and workflows. All AI coding agents (Gemini, Antigravity, Claude, ChatGPT, Cursor, etc.) working on the KH Therapy platform MUST strictly follow the directives outlined in this document.

---

## 🎯 1. Primary Rule: Keep `MEMORY.md` Up To Date

`MEMORY.md` is the **Single Source of Truth (SSOT)** for this repository's system architecture, schema, features, and workflows.

### ⚠️ MANDATORY INSTRUCTION
**Whenever you make ANY change to this codebase, you MUST review and update [`MEMORY.md`](file:///Users/prashant/Documents/Application%20directory/KH/MEMORY.md).**

You must update `MEMORY.md` immediately if your changes involve:
- 🗄️ **Database Schema & SQL**: Creating, altering, or dropping tables, columns, constraints, foreign keys, indexes, or RLS policies.
- ⚙️ **Workflows & Logic**: Modifying booking, rescheduling, payment (SumUp), invoice, auth, or email workflows.
- ⚡ **Serverless Functions**: Adding, editing, or removing endpoints in `netlify/functions/`.
- 🔑 **Environment Variables**: Adding, updating, or removing environment variables in `.env` or Netlify configuration.
- 🧩 **Components & Pages**: Adding new major pages, user controls, or admin management modules.
- 🔒 **Security & GDPR**: Modifying encryption logic, CSRF tokens, consent tracking, or audit log schemas.

---

## 🛠️ 2. Tech Stack & Architecture Rules

1. **Frontend Stack**: React 18 SPA built with Vite and TypeScript. Styling uses Vanilla CSS and Tailwind utilities. Keep UI components responsive, accessible, and fast.
2. **Backend Stack**: Netlify Serverless Functions (`netlify/functions/` in Node.js/TypeScript/CommonJS). All server-side privileges (e.g., `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `SUMUP_SECRET_KEY`, SMTP credentials) MUST remain isolated within Netlify functions.
3. **Database Stack**: Supabase PostgreSQL database. Access tables via Supabase JS client (`src/supabaseClient.ts`) or serverless functions.
4. **Custom Auth**: The project uses custom session management (`persistSession: false`, `autoRefreshToken: false` in `supabaseClient.ts`). Do NOT rely on standard Supabase Auth session persistence unless explicitly requested.

---

## 🔐 3. Security, PII Encryption & GDPR Guidelines

1. **PII Encryption**:
   - Sensitive customer data (e.g. `date_of_birth`, medical notes) MUST be encrypted server-side using AES-256 via Netlify functions (`encrypt-data.ts` and `decrypt-data.ts`).
   - Use `encryptionServerWrapper.ts` on the client side when writing or reading encrypted PII.
   - NEVER store unencrypted PII in client-side localStorage or plain text database columns intended for encrypted data.
2. **CSRF Protection**:
   - Ensure CSRF tokens are checked via `csrfValidation.ts` middleware for state-changing Netlify function calls.
3. **GDPR Anonymization & Audit Logging**:
   - Maintain the `gdpr_anonymized` flag and respect anonymization requests (`gdprUtils.ts`).
   - Log sensitive administrative actions to `gdpr_audit_log`.
4. **Multiple Patients per Email**:
   - The platform supports multiple customer records sharing the same email address (e.g., family members). Ensure customer queries account for both `email` and `id` / `first_name` + `last_name`.

---

## 💳 4. Payment & Email Integration Guidelines

1. **SumUp Payment Integration**:
   - SumUp Hosted Checkout sessions are created via Netlify functions or direct SumUp integration helpers (`enhancedPaymentIntegration.ts`, `sumupRealApiImplementation.ts`).
   - Payment return callback handling is processed by `sumup-return.cjs`. Status checks synchronize `payments`, `payment_requests`, `invoices`, and `bookings` tables atomically.
2. **Email Workflow & Calendar Invites**:
   - Transactional emails (Booking Confirmations, Rescheduling Requests/Approvals, Cancellations, Payment Links, Invoices) are dispatched via `send-email.cjs` using Nodemailer SMTP.
   - Appointment confirmation emails MUST include `.ics` calendar invite attachments.

---

## 📅 5. Appointment & Rescheduling Rules

1. **Customer Rescheduling**:
   - Customers rescheduling within 24 hours of an appointment MUST trigger an approval request (`rescheduling_requests` table with status `'pending'`) for admin review.
   - Customers rescheduling >24 hours in advance can perform direct rescheduling.
2. **Admin Rescheduling**:
   - Admins performing rescheduling via the Admin Console (`Bookings.tsx`) bypass the 24-hour approval restriction (`isAdmin={true}` flag on `RescheduleModal.tsx`).

---

## 🧪 6. Code Quality & Verification Protocol

1. **Type Checking & Build Verification**:
   - BEFORE concluding any task or declaring completion, ALWAYS run:
     ```bash
     npx tsc --noEmit
     ```
   - Ensure there are zero TypeScript compilation errors.
2. **Non-Destructive Database Migrations**:
   - When modifying SQL schema, place migration files in `database/`. Use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` to ensure non-destructive execution in Supabase.
3. **Log & Exception Handling**:
   - Log errors gracefully using `logger.ts` or `console.error` without swallowing exceptions silently or exposing unhandled runtime crashes to the user.

---
*Follow these instructions diligently on every turn to maintain project integrity.*
