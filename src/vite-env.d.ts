/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_EMAILJS_SERVICE_ID: string
  readonly VITE_EMAILJS_PUBLIC_KEY: string
  readonly VITE_EMAILJS_TEMPLATE_BOOKING_CONFIRMATION: string
  readonly VITE_EMAILJS_TEMPLATE_BOOKING_REMINDER: string
  readonly VITE_EMAILJS_TEMPLATE_PAYMENT_RECEIPT: string
  readonly VITE_EMAILJS_TEMPLATE_ADMIN_NOTIFICATION: string
  readonly VITE_SUMUP_APP_ID: string
  readonly VITE_SUMUP_MERCHANT_CODE: string
  readonly VITE_SUMUP_ENVIRONMENT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
