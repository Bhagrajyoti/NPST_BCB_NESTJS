export const NOTIFICATION_TEMPLATE_KEYS = {
  REGISTRATION_OTP: 'registration_otp',
  REGISTRATION_SUCCESS: 'registration_success',
  BILL_PAYMENT_SUCCESS: 'bill_payment_success',
  BILL_PAYMENT_FAILED: 'bill_payment_failed',
  ADMIN_ACTION_AUDITED: 'admin_action_audited',
} as const;

export type NotificationTemplateKey =
  (typeof NOTIFICATION_TEMPLATE_KEYS)[keyof typeof NOTIFICATION_TEMPLATE_KEYS];
