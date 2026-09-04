export interface AuthenticatedUser {
  id: string;
  username: string;
  roles: string[];
  tenantId?: string;
}
