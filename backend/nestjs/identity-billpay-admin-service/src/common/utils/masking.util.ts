// Masks PII before it reaches logs (used by LoggingInterceptor).

export function maskMobile(mobile: string): string {
  return mobile.replace(/(\d{2})\d+(\d{2})/, '$1******$2');
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  return `${user.slice(0, 2)}***@${domain}`;
}
