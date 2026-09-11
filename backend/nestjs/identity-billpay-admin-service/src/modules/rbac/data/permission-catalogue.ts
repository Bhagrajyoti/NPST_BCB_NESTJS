/**
 * Permission Catalogue -- Single Source of Truth (backend copy)
 * ------------------------------------------------
 * Mirrors the frontend's `catalogue.ts` (Bharat Bank Configurable RBAC design doc, sections
 * 4-6) so the two stay in lockstep — this is what PermissionCatalogueSeeder (bootstrap-seeder.ts)
 * inserts into `rbac_permission` on every app start, and what `POST /permissions/list` then
 * serves back, letting the frontend eventually switch its `rbacSource` from this local file to
 * the live backend instead of maintaining two copies by hand.
 *
 * Model: Module -> Resource -> Action -> Permission (design doc section 4). This is DATA, not
 * logic — nothing in this service should hardcode a role name to decide what's authorized;
 * that goes through the `rbac_role_permission` mappings (see role-matrix.default.ts).
 */

export interface PermissionDef {
  code: string;
  description: string;
  module: string;
  highRisk?: boolean;
}

export interface PermissionModule {
  key: string;
  label: string;
  permissions: PermissionDef[];
}

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    key: 'CUSTOMER',
    label: 'Customer',
    permissions: [
      { code: 'CUSTOMER_VIEW', description: 'View customer information', module: 'CUSTOMER' },
      { code: 'CUSTOMER_SEARCH', description: 'Search customers', module: 'CUSTOMER' },
      { code: 'CUSTOMER_CREATE', description: 'Create customer', module: 'CUSTOMER' },
      { code: 'CUSTOMER_EDIT', description: 'Edit customer', module: 'CUSTOMER' },
      { code: 'CUSTOMER_EXPORT', description: 'Export customer data', module: 'CUSTOMER' },
      { code: 'CUSTOMER_REQUEST_VIEW', description: "View customer's service requests", module: 'CUSTOMER' },
    ],
  },
  {
    key: 'ACCOUNTS',
    label: 'Accounts',
    permissions: [
      { code: 'ACCOUNT_VIEW', description: 'View accounts', module: 'ACCOUNTS' },
      { code: 'ACCOUNT_SEARCH', description: 'Search accounts', module: 'ACCOUNTS' },
      { code: 'ACCOUNT_CREATE', description: 'Create account', module: 'ACCOUNTS' },
      { code: 'ACCOUNT_EDIT', description: 'Edit account', module: 'ACCOUNTS' },
      { code: 'ACCOUNT_CLOSE', description: 'Close account', module: 'ACCOUNTS' },
      { code: 'ACCOUNT_EXPORT', description: 'Export account data', module: 'ACCOUNTS' },
    ],
  },
  {
    key: 'SERVICE_REQUESTS',
    label: 'Service Requests',
    permissions: [
      { code: 'SERVICE_REQUEST_VIEW', description: 'View requests', module: 'SERVICE_REQUESTS' },
      { code: 'SERVICE_REQUEST_CREATE', description: 'Create request', module: 'SERVICE_REQUESTS' },
      { code: 'SERVICE_REQUEST_EDIT', description: 'Edit request', module: 'SERVICE_REQUESTS' },
      { code: 'SERVICE_REQUEST_SUBMIT', description: 'Submit for checking', module: 'SERVICE_REQUESTS' },
      { code: 'SERVICE_REQUEST_APPROVE', description: 'Approve request', module: 'SERVICE_REQUESTS' },
      { code: 'SERVICE_REQUEST_REJECT', description: 'Reject request', module: 'SERVICE_REQUESTS' },
      { code: 'SERVICE_REQUEST_CANCEL', description: 'Cancel request', module: 'SERVICE_REQUESTS' },
      { code: 'SERVICE_REQUEST_ASSIGN', description: 'Assign request', module: 'SERVICE_REQUESTS' },
      { code: 'SERVICE_REQUEST_EXPORT', description: 'Export requests', module: 'SERVICE_REQUESTS' },
    ],
  },
  {
    key: 'CARDS',
    label: 'Cards',
    permissions: [
      { code: 'CARD_VIEW', description: 'View cards', module: 'CARDS' },
      { code: 'CARD_SEARCH', description: 'Search cards', module: 'CARDS' },
      { code: 'CARD_REQUEST_VIEW', description: 'View card requests', module: 'CARDS' },
      { code: 'CARD_REQUEST_CREATE', description: 'Create card request', module: 'CARDS' },
      { code: 'CARD_REQUEST_EDIT', description: 'Edit card request', module: 'CARDS' },
      { code: 'CARD_REQUEST_SUBMIT', description: 'Submit card request', module: 'CARDS' },
      { code: 'CARD_REQUEST_APPROVE', description: 'Approve card request', module: 'CARDS' },
      { code: 'CARD_REQUEST_REJECT', description: 'Reject card request', module: 'CARDS' },
      { code: 'CARD_BLOCK', description: 'Block card', module: 'CARDS' },
      { code: 'CARD_UNBLOCK', description: 'Unblock card', module: 'CARDS' },
    ],
  },
  {
    key: 'LOANS',
    label: 'Loans',
    permissions: [
      { code: 'LOAN_VIEW', description: 'View loans', module: 'LOANS' },
      { code: 'LOAN_SEARCH', description: 'Search loans', module: 'LOANS' },
      { code: 'LOAN_REQUEST_VIEW', description: 'View loan requests', module: 'LOANS' },
      { code: 'LOAN_REQUEST_CREATE', description: 'Create loan request', module: 'LOANS' },
      { code: 'LOAN_REQUEST_EDIT', description: 'Edit loan request', module: 'LOANS' },
      { code: 'LOAN_REQUEST_SUBMIT', description: 'Submit loan request', module: 'LOANS' },
      { code: 'LOAN_REQUEST_APPROVE', description: 'Approve loan request', module: 'LOANS' },
      { code: 'LOAN_REQUEST_REJECT', description: 'Reject loan request', module: 'LOANS' },
      { code: 'LOAN_REQUEST_CANCEL', description: 'Cancel loan request', module: 'LOANS' },
      { code: 'LOAN_REPAYMENT_VIEW', description: 'View repayment information', module: 'LOANS' },
      { code: 'LOAN_CLOSURE_VIEW', description: 'View closure information', module: 'LOANS' },
      { code: 'LOAN_EXPORT', description: 'Export loan data', module: 'LOANS' },
    ],
  },
  {
    key: 'DEPOSITS',
    label: 'Deposits',
    permissions: [
      { code: 'DEPOSIT_VIEW', description: 'View deposits', module: 'DEPOSITS' },
      { code: 'DEPOSIT_SEARCH', description: 'Search deposits', module: 'DEPOSITS' },
      { code: 'DEPOSIT_PRODUCT_VIEW', description: 'View products', module: 'DEPOSITS' },
      { code: 'DEPOSIT_PRODUCT_CREATE', description: 'Create product', module: 'DEPOSITS' },
      { code: 'DEPOSIT_PRODUCT_EDIT', description: 'Edit product', module: 'DEPOSITS' },
      { code: 'DEPOSIT_REQUEST_VIEW', description: 'View deposit requests', module: 'DEPOSITS' },
      { code: 'DEPOSIT_REQUEST_CREATE', description: 'Create request', module: 'DEPOSITS' },
      { code: 'DEPOSIT_REQUEST_EDIT', description: 'Edit request', module: 'DEPOSITS' },
      { code: 'DEPOSIT_REQUEST_SUBMIT', description: 'Submit request', module: 'DEPOSITS' },
      { code: 'DEPOSIT_REQUEST_APPROVE', description: 'Approve request', module: 'DEPOSITS' },
      { code: 'DEPOSIT_REQUEST_REJECT', description: 'Reject request', module: 'DEPOSITS' },
      { code: 'DEPOSIT_RENEWAL', description: 'Manage renewal', module: 'DEPOSITS' },
      { code: 'DEPOSIT_PREMATURE_CLOSURE', description: 'Manage premature closure', module: 'DEPOSITS' },
      { code: 'DEPOSIT_MATURITY', description: 'Manage maturity', module: 'DEPOSITS' },
    ],
  },
  {
    key: 'TRANSACTIONS',
    label: 'Transactions',
    permissions: [
      { code: 'TRANSACTION_VIEW', description: 'View transactions', module: 'TRANSACTIONS' },
      { code: 'TRANSACTION_SEARCH', description: 'Search transactions', module: 'TRANSACTIONS' },
      { code: 'TRANSACTION_EXPORT', description: 'Export transactions', module: 'TRANSACTIONS' },
      { code: 'REFUND_VIEW', description: 'View refunds', module: 'TRANSACTIONS' },
      { code: 'REFUND_CREATE', description: 'Create refund', module: 'TRANSACTIONS' },
      { code: 'REFUND_EDIT', description: 'Edit refund', module: 'TRANSACTIONS' },
      { code: 'REFUND_SUBMIT', description: 'Submit refund', module: 'TRANSACTIONS' },
      { code: 'REFUND_APPROVE', description: 'Approve refund', module: 'TRANSACTIONS' },
      { code: 'REFUND_REJECT', description: 'Reject refund', module: 'TRANSACTIONS' },
      { code: 'DISPUTE_VIEW', description: 'View disputes', module: 'TRANSACTIONS' },
      { code: 'DISPUTE_CREATE', description: 'Create dispute', module: 'TRANSACTIONS' },
      { code: 'DISPUTE_UPDATE', description: 'Update dispute', module: 'TRANSACTIONS' },
    ],
  },
  {
    key: 'DIGITAL_BANKING',
    label: 'Digital Banking',
    permissions: [
      { code: 'DIGITAL_USER_VIEW', description: 'View digital banking users', module: 'DIGITAL_BANKING' },
      { code: 'DIGITAL_USER_SEARCH', description: 'Search users', module: 'DIGITAL_BANKING' },
      { code: 'DIGITAL_USER_CREATE', description: 'Create/manage digital user', module: 'DIGITAL_BANKING' },
      { code: 'DIGITAL_USER_EDIT', description: 'Edit digital user', module: 'DIGITAL_BANKING' },
      { code: 'DIGITAL_REQUEST_VIEW', description: 'View digital requests', module: 'DIGITAL_BANKING' },
      { code: 'DIGITAL_REQUEST_CREATE', description: 'Create request', module: 'DIGITAL_BANKING' },
      { code: 'DIGITAL_REQUEST_EDIT', description: 'Edit request', module: 'DIGITAL_BANKING' },
      { code: 'DIGITAL_REQUEST_APPROVE', description: 'Approve request', module: 'DIGITAL_BANKING' },
      { code: 'DIGITAL_REQUEST_REJECT', description: 'Reject request', module: 'DIGITAL_BANKING' },
    ],
  },
  {
    key: 'BENEFICIARIES',
    label: 'Beneficiaries',
    permissions: [
      { code: 'BENEFICIARY_VIEW', description: 'View beneficiaries', module: 'BENEFICIARIES' },
      { code: 'BENEFICIARY_SEARCH', description: 'Search beneficiaries', module: 'BENEFICIARIES' },
      { code: 'BENEFICIARY_REQUEST_VIEW', description: 'View beneficiary requests', module: 'BENEFICIARIES' },
      { code: 'BENEFICIARY_REQUEST_CREATE', description: 'Create request', module: 'BENEFICIARIES' },
      { code: 'BENEFICIARY_REQUEST_EDIT', description: 'Edit request', module: 'BENEFICIARIES' },
      { code: 'BENEFICIARY_REQUEST_SUBMIT', description: 'Submit request', module: 'BENEFICIARIES' },
      { code: 'BENEFICIARY_REQUEST_APPROVE', description: 'Approve request', module: 'BENEFICIARIES' },
      { code: 'BENEFICIARY_REQUEST_REJECT', description: 'Reject request', module: 'BENEFICIARIES' },
      { code: 'BENEFICIARY_COOLING_PERIOD_VIEW', description: 'View cooling period', module: 'BENEFICIARIES' },
      {
        code: 'BENEFICIARY_COOLING_PERIOD_OVERRIDE',
        description: 'Override cooling period',
        module: 'BENEFICIARIES',
        highRisk: true,
      },
    ],
  },
  {
    key: 'KYC_COMPLIANCE',
    label: 'KYC & Compliance',
    permissions: [
      { code: 'KYC_VIEW', description: 'View KYC', module: 'KYC_COMPLIANCE' },
      { code: 'KYC_SEARCH', description: 'Search KYC', module: 'KYC_COMPLIANCE' },
      { code: 'KYC_EDIT', description: 'Edit KYC', module: 'KYC_COMPLIANCE' },
      { code: 'KYC_REQUEST_VIEW', description: 'View KYC requests', module: 'KYC_COMPLIANCE' },
      { code: 'KYC_REQUEST_CREATE', description: 'Create KYC request', module: 'KYC_COMPLIANCE' },
      { code: 'KYC_REQUEST_UPDATE', description: 'Update KYC request', module: 'KYC_COMPLIANCE' },
      { code: 'KYC_REQUEST_APPROVE', description: 'Approve KYC request', module: 'KYC_COMPLIANCE' },
      { code: 'KYC_REQUEST_REJECT', description: 'Reject KYC request', module: 'KYC_COMPLIANCE' },
      { code: 'COMPLIANCE_CASE_VIEW', description: 'View compliance cases', module: 'KYC_COMPLIANCE' },
      { code: 'COMPLIANCE_CASE_CREATE', description: 'Create compliance case', module: 'KYC_COMPLIANCE' },
      { code: 'COMPLIANCE_CASE_UPDATE', description: 'Update case', module: 'KYC_COMPLIANCE' },
      { code: 'COMPLIANCE_CASE_ASSIGN', description: 'Assign case', module: 'KYC_COMPLIANCE' },
      { code: 'COMPLIANCE_CASE_ESCALATE', description: 'Escalate case', module: 'KYC_COMPLIANCE' },
      { code: 'COMPLIANCE_CASE_CLOSE', description: 'Close case', module: 'KYC_COMPLIANCE' },
    ],
  },
  {
    key: 'RULES_LIMITS',
    label: 'Rules & Limits',
    permissions: [
      { code: 'RULE_VIEW', description: 'View rules', module: 'RULES_LIMITS' },
      { code: 'RULE_CREATE', description: 'Create rule', module: 'RULES_LIMITS' },
      { code: 'RULE_EDIT', description: 'Edit rule', module: 'RULES_LIMITS' },
      { code: 'RULE_DELETE', description: 'Delete rule', module: 'RULES_LIMITS' },
      { code: 'RULE_ACTIVATE', description: 'Activate rule', module: 'RULES_LIMITS', highRisk: true },
      { code: 'RULE_DEACTIVATE', description: 'Deactivate rule', module: 'RULES_LIMITS', highRisk: true },
      { code: 'TRANSACTION_LIMIT_VIEW', description: 'View transaction limits', module: 'RULES_LIMITS' },
      { code: 'TRANSACTION_LIMIT_CREATE', description: 'Create transaction limit', module: 'RULES_LIMITS' },
      {
        code: 'TRANSACTION_LIMIT_EDIT',
        description: 'Edit transaction limit',
        module: 'RULES_LIMITS',
        highRisk: true,
      },
      {
        code: 'TRANSACTION_LIMIT_APPROVE',
        description: 'Approve transaction limit',
        module: 'RULES_LIMITS',
        highRisk: true,
      },
      { code: 'CUSTOMER_LIMIT_VIEW', description: 'View customer limits', module: 'RULES_LIMITS' },
      { code: 'CUSTOMER_LIMIT_EDIT', description: 'Edit customer limits', module: 'RULES_LIMITS' },
      { code: 'CHANNEL_LIMIT_VIEW', description: 'View channel limits', module: 'RULES_LIMITS' },
      { code: 'CHANNEL_LIMIT_EDIT', description: 'Edit channel limits', module: 'RULES_LIMITS' },
    ],
  },
  {
    key: 'APPLICATION_MANAGEMENT',
    label: 'Application Management',
    permissions: [
      { code: 'APP_CONFIG_VIEW', description: 'View application configuration', module: 'APPLICATION_MANAGEMENT' },
      {
        code: 'APP_CONFIG_EDIT',
        description: 'Edit application configuration',
        module: 'APPLICATION_MANAGEMENT',
        highRisk: true,
      },
      { code: 'SERVICE_AVAILABILITY_VIEW', description: 'View service availability', module: 'APPLICATION_MANAGEMENT' },
      { code: 'SERVICE_AVAILABILITY_EDIT', description: 'Change service availability', module: 'APPLICATION_MANAGEMENT' },
      { code: 'MAINTENANCE_VIEW', description: 'View maintenance configuration', module: 'APPLICATION_MANAGEMENT' },
      { code: 'MAINTENANCE_CREATE', description: 'Create maintenance window', module: 'APPLICATION_MANAGEMENT' },
      { code: 'MAINTENANCE_EDIT', description: 'Edit maintenance window', module: 'APPLICATION_MANAGEMENT' },
      {
        code: 'MAINTENANCE_ACTIVATE',
        description: 'Activate maintenance',
        module: 'APPLICATION_MANAGEMENT',
        highRisk: true,
      },
      {
        code: 'MAINTENANCE_DEACTIVATE',
        description: 'Deactivate maintenance',
        module: 'APPLICATION_MANAGEMENT',
        highRisk: true,
      },
      { code: 'MOBILE_APPEARANCE_VIEW', description: 'View Mobile Appearance', module: 'APPLICATION_MANAGEMENT' },
      { code: 'MOBILE_APPEARANCE_EDIT', description: 'Edit Mobile Appearance', module: 'APPLICATION_MANAGEMENT' },
      { code: 'MOBILE_BRANDING_VIEW', description: 'View Mobile Branding', module: 'APPLICATION_MANAGEMENT' },
      { code: 'MOBILE_BRANDING_EDIT', description: 'Edit Mobile Branding', module: 'APPLICATION_MANAGEMENT' },
    ],
  },
  {
    key: 'REPORTS',
    label: 'Reports',
    permissions: [
      { code: 'REPORT_VIEW', description: 'View reports', module: 'REPORTS' },
      { code: 'REPORT_GENERATE', description: 'Generate reports', module: 'REPORTS' },
      { code: 'REPORT_EXPORT', description: 'Export reports', module: 'REPORTS' },
      { code: 'REPORT_SCHEDULE', description: 'Schedule reports', module: 'REPORTS' },
    ],
  },
  {
    key: 'USER_MANAGEMENT',
    label: 'User Management',
    permissions: [
      { code: 'USER_VIEW', description: 'View users', module: 'USER_MANAGEMENT' },
      { code: 'USER_SEARCH', description: 'Search users', module: 'USER_MANAGEMENT' },
      { code: 'USER_CREATE', description: 'Create user', module: 'USER_MANAGEMENT' },
      { code: 'USER_EDIT', description: 'Edit user', module: 'USER_MANAGEMENT' },
      { code: 'USER_DISABLE', description: 'Disable user', module: 'USER_MANAGEMENT', highRisk: true },
      { code: 'USER_ENABLE', description: 'Enable user', module: 'USER_MANAGEMENT' },
      { code: 'USER_RESET_ACCESS', description: 'Reset user access', module: 'USER_MANAGEMENT' },
      { code: 'USER_ASSIGN_ROLE', description: 'Assign role', module: 'USER_MANAGEMENT', highRisk: true },
      { code: 'USER_REMOVE_ROLE', description: 'Remove role', module: 'USER_MANAGEMENT' },
      { code: 'USER_VIEW_ACTIVITY', description: 'View user activity', module: 'USER_MANAGEMENT' },
    ],
  },
  {
    key: 'ROLE_MANAGEMENT',
    label: 'Role Management',
    permissions: [
      { code: 'ROLE_VIEW', description: 'View roles', module: 'ROLE_MANAGEMENT' },
      { code: 'ROLE_CREATE', description: 'Create role', module: 'ROLE_MANAGEMENT' },
      { code: 'ROLE_EDIT', description: 'Edit role', module: 'ROLE_MANAGEMENT' },
      { code: 'ROLE_DELETE', description: 'Delete role', module: 'ROLE_MANAGEMENT', highRisk: true },
      {
        code: 'ROLE_ASSIGN_PERMISSION',
        description: 'Assign permissions to role',
        module: 'ROLE_MANAGEMENT',
        highRisk: true,
      },
      { code: 'ROLE_REMOVE_PERMISSION', description: 'Remove permissions from role', module: 'ROLE_MANAGEMENT' },
      { code: 'ROLE_ASSIGN_USER', description: 'Assign user to role', module: 'ROLE_MANAGEMENT' },
      { code: 'ROLE_REMOVE_USER', description: 'Remove user from role', module: 'ROLE_MANAGEMENT' },
      { code: 'ROLE_VIEW_USERS', description: 'View users assigned to role', module: 'ROLE_MANAGEMENT' },
    ],
  },
  {
    key: 'AUDIT_SECURITY',
    label: 'Audit & Security',
    permissions: [
      { code: 'AUDIT_LOG_VIEW', description: 'View audit logs', module: 'AUDIT_SECURITY' },
      { code: 'AUDIT_LOG_SEARCH', description: 'Search audit logs', module: 'AUDIT_SECURITY' },
      { code: 'AUDIT_LOG_EXPORT', description: 'Export audit logs', module: 'AUDIT_SECURITY' },
      { code: 'SECURITY_EVENT_VIEW', description: 'View security events', module: 'AUDIT_SECURITY' },
      { code: 'LOGIN_ACTIVITY_VIEW', description: 'View login activity', module: 'AUDIT_SECURITY' },
      { code: 'SESSION_VIEW', description: 'View active sessions', module: 'AUDIT_SECURITY' },
      { code: 'SESSION_TERMINATE', description: 'Terminate active session', module: 'AUDIT_SECURITY', highRisk: true },
    ],
  },
];

/** Flat list of every permission definition, derived from PERMISSION_MODULES. */
export const ALL_PERMISSIONS: PermissionDef[] = PERMISSION_MODULES.flatMap((m) => m.permissions);

/** Every valid permission code, for fast lookup / validation. */
export const ALL_PERMISSION_CODES: string[] = ALL_PERMISSIONS.map((p) => p.code);

/** High-risk permissions (design doc, section 13) — flagged via `highRisk` on `rbac_permission`. */
export const HIGH_RISK_PERMISSION_CODES: string[] = ALL_PERMISSIONS.filter((p) => p.highRisk).map((p) => p.code);
