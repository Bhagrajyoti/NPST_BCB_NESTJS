export const API_AUDIENCE = {
  MOBILE_CUSTOMER:
    '**Audience:** Mobile app (retail/corporate **customer**). Use Keycloak client `mobile-app` for login.',
  ADMIN_PORTAL:
    '**Audience:** Admin web portal (**bank staff** / superadmin). Use Keycloak client `admin-web` for login.',
  BOTH:
    '**Audience:** Mobile app (customer) and admin web portal (bank staff), depending on the operation.',
} as const;

export function mobileCustomerOp(summary: string, detail: string): { summary: string; description: string } {
  return {
    summary: `[Mobile / Customer] ${summary}`,
    description: `${API_AUDIENCE.MOBILE_CUSTOMER}\n\n${detail}`,
  };
}

export function adminPortalOp(summary: string, detail: string): { summary: string; description: string } {
  return {
    summary: `[Admin] ${summary}`,
    description: `${API_AUDIENCE.ADMIN_PORTAL}\n\n${detail}`,
  };
}
