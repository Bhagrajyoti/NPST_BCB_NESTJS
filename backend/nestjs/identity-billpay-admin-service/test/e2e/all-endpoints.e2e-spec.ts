import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import {
  authedRequest,
  createTestApp,
  mockBbpsAdapter,
  mockKeycloakService,
  publicRequest,
  TEST_BANK_ADMIN,
  TEST_NO_ROLE,
} from './helpers/test-app';
import { AdminUser } from '../../src/modules/admin/admin-user/entities/admin-user.entity';
import { BillerRegistration } from '../../src/modules/bill-payment/biller/entities/biller-registration.entity';
import { MockBill } from '../../src/modules/bill-payment/bill/entities/mock-bill.entity';

describe('All API endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health', () => {
    it('POST /api/v1/health/check', async () => {
      const res = await publicRequest(app).post('/api/v1/health/check').expect(201);
      expect(res.body.data.status).toBe('ok');
    });
  });

  describe('Auth', () => {
    it('POST /api/v1/auth/signup', async () => {
      const res = await publicRequest(app)
        .post('/api/v1/auth/signup')
        .send({ username: `signup.user.${Date.now()}`, password: 'SignupPass@123' })
        .expect(201);
      expect(res.body.data.keycloakUserId).toBeDefined();
      expect(mockKeycloakService.signup).toHaveBeenCalled();
    });

    it('POST /api/v1/auth/login', async () => {
      const res = await publicRequest(app)
        .post('/api/v1/auth/login')
        .send({ username: 'api-test-user', password: 'ApiTest@123' })
        .expect(201);
      expect(res.body.data.accessToken).toBe('test-access-token');
      expect(mockKeycloakService.login).toHaveBeenCalled();
    });

    it('POST /api/v1/auth/logout', async () => {
      const res = await authedRequest(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'test-refresh-token', clientId: 'admin-web' })
        .expect(201);
      expect(res.body.data.loggedOut).toBe(true);
    });

    it('POST /api/v1/auth/me', async () => {
      const res = await authedRequest(app).post('/api/v1/auth/me').expect(201);
      expect(res.body.data.user).toBeDefined();
    });
  });

  describe('Auth — Registration', () => {
    it('POST /api/v1/auth/registration/list', async () => {
      await authedRequest(app).post('/api/v1/auth/registration/list').expect(201);
    });

    it('POST /api/v1/auth/registration/create', async () => {
      const res = await publicRequest(app)
        .post('/api/v1/auth/registration/create')
        .send({ mobileNumber: '9876543210' })
        .expect(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.registeredAccounts).toBeDefined();
    });

    it('POST /api/v1/auth/registration/get', async () => {
      const created = await publicRequest(app)
        .post('/api/v1/auth/registration/create')
        .send({ mobileNumber: '9876543211' });

      await authedRequest(app)
        .post('/api/v1/auth/registration/get')
        .send({ id: created.body.data.id })
        .expect(201);
    });

    it('POST /api/v1/auth/registration/delete', async () => {
      const created = await publicRequest(app)
        .post('/api/v1/auth/registration/create')
        .send({ mobileNumber: '9876543212' });

      const res = await authedRequest(app)
        .post('/api/v1/auth/registration/delete')
        .send({ id: created.body.data.id })
        .expect(201);
      expect(res.body.data.deleted).toBe(true);
    });
  });

  describe('Customers', () => {
    it('POST /api/v1/customer/list — public, no body, returns mock customer data directly', async () => {
      const res = await publicRequest(app).post('/api/v1/customer/list').expect(201);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].mobileNumber).toBeDefined();
      expect(res.body.data[0].accountNumber).toBeDefined();
      expect(res.body.data[0].debitCardCvv).toBeUndefined();
    });
  });

  describe('Auth — Credential', () => {
    const keycloakUserId = '334b032c-7468-47fa-82a3-8204b80913a2';

    it('POST /api/v1/auth/credential/list', async () => {
      await authedRequest(app).post('/api/v1/auth/credential/list').expect(201);
    });

    it('POST /api/v1/auth/credential/create', async () => {
      const res = await authedRequest(app)
        .post('/api/v1/auth/credential/create')
        .send({ userId: keycloakUserId, mpin: '1234' })
        .expect(201);
      expect(res.body.data.keycloakUserId).toBe(keycloakUserId);
      expect(res.body.data.mpin.hasMpin).toBe(true);
    });

    it('POST /api/v1/auth/credential/get', async () => {
      await authedRequest(app)
        .post('/api/v1/auth/credential/get')
        .send({ userId: keycloakUserId })
        .expect(201);
    });

    it('POST /api/v1/auth/credential/get without body uses token user', async () => {
      const userApp = await createTestApp({
        sub: keycloakUserId,
        realm_access: { roles: ['BANK_SUPER_ADMIN'] },
      });
      await authedRequest(userApp).post('/api/v1/auth/credential/get').send({}).expect(201);
      await userApp.close();
    });

    it('POST /api/v1/auth/credential/delete', async () => {
      const res = await authedRequest(app)
        .post('/api/v1/auth/credential/delete')
        .send({ userId: keycloakUserId })
        .expect(201);
      expect(res.body.data.deleted).toBe(true);
    });
  });

  describe('Auth — Device', () => {
    it('POST /api/v1/auth/device/list', async () => {
      await authedRequest(app).post('/api/v1/auth/device/list').expect(201);
    });

    it('POST /api/v1/auth/device/create', async () => {
      const res = await authedRequest(app)
        .post('/api/v1/auth/device/create')
        .send({ userId: randomUUID(), deviceId: `device-${Date.now()}`, deviceModel: 'Test Phone' })
        .expect(201);
      expect(res.body.data.id).toBeDefined();
    });

    it('POST /api/v1/auth/device/get', async () => {
      const created = await authedRequest(app)
        .post('/api/v1/auth/device/create')
        .send({ userId: randomUUID(), deviceId: `device-get-${Date.now()}` });

      await authedRequest(app)
        .post('/api/v1/auth/device/get')
        .send({ id: created.body.data.id })
        .expect(201);
    });

    it('POST /api/v1/auth/device/delete', async () => {
      const created = await authedRequest(app)
        .post('/api/v1/auth/device/create')
        .send({ userId: randomUUID(), deviceId: `device-del-${Date.now()}` });

      const res = await authedRequest(app)
        .post('/api/v1/auth/device/delete')
        .send({ id: created.body.data.id })
        .expect(201);
      expect(res.body.data.deleted).toBe(true);
    });
  });

  describe('Auth — Corporate Hierarchy', () => {
    it('POST /api/v1/auth/corporate-hierarchy/list', async () => {
      await authedRequest(app).post('/api/v1/auth/corporate-hierarchy/list').expect(201);
    });

    it('POST /api/v1/auth/corporate-hierarchy/create', async () => {
      const res = await authedRequest(app)
        .post('/api/v1/auth/corporate-hierarchy/create')
        .send({
          userId: randomUUID(),
          cif: `CIF-${Date.now()}`,
          role: 'CORPORATE_MAKER',
        })
        .expect(201);
      expect(res.body.data.id).toBeDefined();
    });

    it('POST /api/v1/auth/corporate-hierarchy/get', async () => {
      const created = await authedRequest(app)
        .post('/api/v1/auth/corporate-hierarchy/create')
        .send({
          userId: randomUUID(),
          cif: `CIF-GET-${Date.now()}`,
          role: 'CORPORATE_VIEWER',
        });

      await authedRequest(app)
        .post('/api/v1/auth/corporate-hierarchy/get')
        .send({ id: created.body.data.id })
        .expect(201);
    });

    it('POST /api/v1/auth/corporate-hierarchy/delete', async () => {
      const created = await authedRequest(app)
        .post('/api/v1/auth/corporate-hierarchy/create')
        .send({
          userId: randomUUID(),
          cif: `CIF-DEL-${Date.now()}`,
          role: 'CORPORATE_CHECKER',
        });

      const res = await authedRequest(app)
        .post('/api/v1/auth/corporate-hierarchy/delete')
        .send({ id: created.body.data.id })
        .expect(201);
      expect(res.body.data.deleted).toBe(true);
    });
  });

  describe('Auth — OTP', () => {
    it('POST /api/v1/auth/otp/list', async () => {
      await authedRequest(app).post('/api/v1/auth/otp/list').expect(201);
    });

    it('POST /api/v1/auth/otp/create', async () => {
      const res = await publicRequest(app)
        .post('/api/v1/auth/otp/create')
        .send({ mobileNumber: '9998887776' })
        .expect(201);
      expect(res.body.data.id).toBeDefined();
    });

    it('POST /api/v1/auth/otp/get', async () => {
      const created = await publicRequest(app)
        .post('/api/v1/auth/otp/create')
        .send({ mobileNumber: '9998887775' });

      await authedRequest(app)
        .post('/api/v1/auth/otp/get')
        .send({ id: created.body.data.id })
        .expect(201);
    });

    it('POST /api/v1/auth/otp/delete', async () => {
      const created = await publicRequest(app)
        .post('/api/v1/auth/otp/create')
        .send({ mobileNumber: '9998887774' });

      const res = await authedRequest(app)
        .post('/api/v1/auth/otp/delete')
        .send({ id: created.body.data.id })
        .expect(201);
      expect(res.body.data.deleted).toBe(true);
    });
  });

  describe('RBAC — Permissions', () => {
    it('POST /api/v1/permissions/list', async () => {
      const res = await authedRequest(app).post('/api/v1/permissions/list').expect(201);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/v1/permissions/create', async () => {
      const code = `PERM_${Date.now()}`;
      const res = await authedRequest(app)
        .post('/api/v1/permissions/create')
        .send({
          code,
          name: 'Test Permission',
          description: 'E2E test permission',
          module: 'TEST',
          action: 'READ',
        })
        .expect(201);
      expect(res.body.data.code).toBe(code);
    });
  });

  describe('RBAC — Roles', () => {
    let permissionId: string;
    let roleId: string;

    beforeAll(async () => {
      const permission = await authedRequest(app)
        .post('/api/v1/permissions/create')
        .send({
          code: `ROLE_PERM_${Date.now()}`,
          name: 'Role Test Permission',
          module: 'TEST',
          action: 'WRITE',
        });
      permissionId = permission.body.data.id;
    });

    it('POST /api/v1/roles/create', async () => {
      const roleName = `TEST_ROLE_${Date.now()}`;
      const res = await authedRequest(app)
        .post('/api/v1/roles/create')
        .send({
          name: roleName,
          displayName: 'Test Role',
          description: 'E2E role',
        })
        .expect(201);
      expect(res.body.data.name).toBe(roleName);
      roleId = res.body.data.id;
      expect(mockKeycloakService.createRealmRole).toHaveBeenCalled();
    });

    it('POST /api/v1/roles/map-permissions', async () => {
      const res = await authedRequest(app)
        .post('/api/v1/roles/map-permissions')
        .send({ roleId, permissionIds: [permissionId] })
        .expect(201);
      expect(res.body.data.permissions).toHaveLength(1);
    });

    it('POST /api/v1/roles/update', async () => {
      const res = await authedRequest(app)
        .post('/api/v1/roles/update')
        .send({
          roleId,
          displayName: 'Updated Test Role',
          description: 'Updated description',
        })
        .expect(201);
      expect(res.body.data.displayName).toBe('Updated Test Role');
    });
  });

  describe('RBAC — Employees', () => {
    it('POST /api/v1/employees/create', async () => {
      const role = await authedRequest(app)
        .post('/api/v1/roles/create')
        .send({
          name: `EMP_ROLE_${Date.now()}`,
          displayName: 'Employee Role',
        });

      const suffix = Date.now();
      const res = await authedRequest(app)
        .post('/api/v1/employees/create')
        .send({
          username: `emp.user.${suffix}`,
          email: `emp.user.${suffix}@test.example.com`,
          firstName: 'Emp',
          lastName: 'User',
          password: 'EmpUser@123',
          roleId: role.body.data.id,
          employeeCode: `EMP-${suffix}`,
        })
        .expect(201);
      expect(res.body.data.employee.keycloakUserId).toBeDefined();
      expect(mockKeycloakService.createUser).toHaveBeenCalled();
    });

    it('POST /api/v1/employees/update-role', async () => {
      const roleA = await authedRequest(app)
        .post('/api/v1/roles/create')
        .send({
          name: `EMP_ROLE_A_${Date.now()}`,
          displayName: 'Employee Role A',
        });

      const roleB = await authedRequest(app)
        .post('/api/v1/roles/create')
        .send({
          name: `EMP_ROLE_B_${Date.now()}`,
          displayName: 'Employee Role B',
        });

      const suffix = Date.now();
      const created = await authedRequest(app)
        .post('/api/v1/employees/create')
        .send({
          username: `emp.update.${suffix}`,
          email: `emp.update.${suffix}@test.example.com`,
          firstName: 'Update',
          lastName: 'Target',
          password: 'EmpUser@123',
          roleId: roleA.body.data.id,
        })
        .expect(201);

      const res = await authedRequest(app)
        .post('/api/v1/employees/update-role')
        .send({
          employeeId: created.body.data.employee.id,
          roleId: roleB.body.data.id,
        })
        .expect(201);

      expect(res.body.data.role.id).toBe(roleB.body.data.id);
      expect(mockKeycloakService.removeRealmRoleFromUser).toHaveBeenCalled();
      expect(mockKeycloakService.assignRealmRoleToUser).toHaveBeenCalled();
    });
  });

  describe('RBAC — Employee hierarchy', () => {
    let superadminApp: INestApplication;
    let bankAdminApp: INestApplication;

    beforeAll(async () => {
      superadminApp = await createTestApp();
      bankAdminApp = await createTestApp({
        sub: '22222222-2222-2222-2222-222222222222',
        realm_access: { roles: ['BANK_ADMIN'] },
      });
    });

    afterAll(async () => {
      await superadminApp.close();
      await bankAdminApp.close();
    });

    it('bank admin cannot update role of a higher-hierarchy employee', async () => {
      const suffix = Date.now();
      const superRole = await authedRequest(superadminApp)
        .post('/api/v1/roles/create')
        .send({
          name: `BANK_SUPER_ADMIN_${suffix}`,
          displayName: 'Super Admin Role',
        });

      const employee = await authedRequest(superadminApp)
        .post('/api/v1/employees/create')
        .send({
          username: `emp.super.${suffix}`,
          email: `emp.super.${suffix}@test.example.com`,
          firstName: 'Super',
          lastName: 'Employee',
          password: 'EmpUser@123',
          roleId: superRole.body.data.id,
        })
        .expect(201);

      const makerRole = await authedRequest(superadminApp)
        .post('/api/v1/roles/create')
        .send({
          name: `BANK_MAKER_${suffix}`,
          displayName: 'Maker Role',
          delegatedAdminKeycloakUserIds: ['22222222-2222-2222-2222-222222222222'],
        });

      await authedRequest(bankAdminApp)
        .post('/api/v1/employees/update-role')
        .send({
          employeeId: employee.body.data.employee.id,
          roleId: makerRole.body.data.id,
        })
        .expect(403);
    });

    it('bank admin can update role of a lower-hierarchy employee', async () => {
      const suffix = Date.now();
      const makerRole = await authedRequest(superadminApp)
        .post('/api/v1/roles/create')
        .send({
          name: `BANK_MAKER_${suffix}`,
          displayName: 'Maker Role',
          delegatedAdminKeycloakUserIds: ['22222222-2222-2222-2222-222222222222'],
        });

      const lowRole = await authedRequest(superadminApp)
        .post('/api/v1/roles/create')
        .send({
          name: `EMP_LOW_${suffix}`,
          displayName: 'Low Role',
          delegatedAdminKeycloakUserIds: ['22222222-2222-2222-2222-222222222222'],
        });

      const employee = await authedRequest(superadminApp)
        .post('/api/v1/employees/create')
        .send({
          username: `emp.maker.${suffix}`,
          email: `emp.maker.${suffix}@test.example.com`,
          firstName: 'Maker',
          lastName: 'Employee',
          password: 'EmpUser@123',
          roleId: makerRole.body.data.id,
        })
        .expect(201);

      const res = await authedRequest(bankAdminApp)
        .post('/api/v1/employees/update-role')
        .send({
          employeeId: employee.body.data.employee.id,
          roleId: lowRole.body.data.id,
        })
        .expect(201);

      expect(res.body.data.role.id).toBe(lowRole.body.data.id);
    });
  });

  describe('RBAC — Users', () => {
    it('POST /api/v1/users/fetch-access-details', async () => {
      const res = await authedRequest(app)
        .post('/api/v1/users/fetch-access-details')
        .send({})
        .expect(201);
      expect(res.body.data).toHaveProperty('count');
      expect(res.body.data).toHaveProperty('users');
    });
  });

  describe('Admin — Admin Users', () => {
    let adminUserRepo: Repository<AdminUser>;
    let seededId: string;

    beforeAll(async () => {
      adminUserRepo = app.get(getRepositoryToken(AdminUser));
      const suffix = Date.now();
      const saved = await adminUserRepo.save(
        adminUserRepo.create({
          employeeId: randomUUID(),
          keycloakUserId: randomUUID(),
          username: `admin.user.${suffix}`,
          email: `admin.user.${suffix}@test.example.com`,
          firstName: 'Admin',
          lastName: 'User',
          roleId: randomUUID(),
          roleName: 'BANK_ADMIN',
          isActive: true,
          lastSyncedAt: new Date(),
        }),
      );
      seededId = saved.id;
    });

    it('POST /api/v1/admin/admin-user/list', async () => {
      const res = await authedRequest(app)
        .post('/api/v1/admin/admin-user/list')
        .send({})
        .expect(201);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((u: { id: string }) => u.id === seededId)).toBe(true);
    });

    it('POST /api/v1/admin/admin-user/get', async () => {
      const res = await authedRequest(app)
        .post('/api/v1/admin/admin-user/get')
        .send({ id: seededId })
        .expect(201);
      expect(res.body.data.id).toBe(seededId);
    });

    it('POST /api/v1/admin/admin-user/get returns 404 for an unknown id', async () => {
      await authedRequest(app)
        .post('/api/v1/admin/admin-user/get')
        .send({ id: randomUUID() })
        .expect(404);
    });

    it('rejects a caller with no admin-portal role', async () => {
      const noRoleApp = await createTestApp(TEST_NO_ROLE);
      await authedRequest(noRoleApp).post('/api/v1/admin/admin-user/list').send({}).expect(403);
      await noRoleApp.close();
    });
  });

  describe('Admin — Authorization Rules', () => {
    let ruleId: string;

    it('POST /api/v1/admin/authorization-rules/create', async () => {
      const res = await authedRequest(app)
        .post('/api/v1/admin/authorization-rules/create')
        .send({
          ruleName: 'High-value transfer approval',
          cif: `CIF-${Date.now()}`,
          threshold: '500000.00',
        })
        .expect(201);
      expect(res.body.data.version).toBe(1);
      ruleId = res.body.data.id;
    });

    it('POST /api/v1/admin/authorization-rules/list', async () => {
      const res = await authedRequest(app)
        .post('/api/v1/admin/authorization-rules/list')
        .expect(201);
      expect(res.body.data.some((r: { id: string }) => r.id === ruleId)).toBe(true);
    });

    it('POST /api/v1/admin/authorization-rules/get', async () => {
      const res = await authedRequest(app)
        .post('/api/v1/admin/authorization-rules/get')
        .send({ id: ruleId })
        .expect(201);
      expect(res.body.data.id).toBe(ruleId);
    });

    it('POST /api/v1/admin/authorization-rules/update', async () => {
      const res = await authedRequest(app)
        .post('/api/v1/admin/authorization-rules/update')
        .send({ id: ruleId, threshold: '750000.00', changeReason: 'Policy update' })
        .expect(201);
      expect(res.body.data.version).toBe(2);
    });

    it('POST /api/v1/admin/authorization-rules/history', async () => {
      const res = await authedRequest(app)
        .post('/api/v1/admin/authorization-rules/history')
        .send({ id: ruleId })
        .expect(201);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('rejects BANK_ADMIN from creating a rule (superadmin-only)', async () => {
      const bankAdminApp = await createTestApp(TEST_BANK_ADMIN);
      await authedRequest(bankAdminApp)
        .post('/api/v1/admin/authorization-rules/create')
        .send({ ruleName: 'Should be rejected', cif: `CIF-${Date.now()}`, threshold: '1000.00' })
        .expect(403);
      await bankAdminApp.close();
    });

    it('allows BANK_ADMIN read-only access', async () => {
      const bankAdminApp = await createTestApp(TEST_BANK_ADMIN);
      await authedRequest(bankAdminApp).post('/api/v1/admin/authorization-rules/list').expect(201);
      await bankAdminApp.close();
    });

    it('rejects a caller with no admin-portal role', async () => {
      const noRoleApp = await createTestApp(TEST_NO_ROLE);
      await authedRequest(noRoleApp).post('/api/v1/admin/authorization-rules/list').expect(403);
      await noRoleApp.close();
    });

    it('POST /api/v1/admin/authorization-rules/deactivate', async () => {
      const res = await authedRequest(app)
        .post('/api/v1/admin/authorization-rules/deactivate')
        .send({ id: ruleId })
        .expect(201);
      expect(res.body.data.deactivated).toBe(true);

      await authedRequest(app)
        .post('/api/v1/admin/authorization-rules/get')
        .send({ id: ruleId })
        .expect(404);
    });
  });

  describe('Admin — Reporting', () => {
    it('GET /api/v1/admin/reporting', async () => {
      const res = await authedRequest(app).get('/api/v1/admin/reporting').expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Bill Payment — Biller', () => {
    let billerId: string;
    const billerCode = `BILLER-${Date.now()}`;

    it('POST /api/v1/bill-payment/biller', async () => {
      const res = await authedRequest(app)
        .post('/api/v1/bill-payment/biller')
        .send({ billerCode, billerName: 'Test Electricity Board', category: 'ELECTRICITY' })
        .expect(201);
      expect(res.body.data.billerCode).toBe(billerCode);
      billerId = res.body.data.id;
    });

    it('GET /api/v1/bill-payment/biller', async () => {
      const res = await authedRequest(app).get('/api/v1/bill-payment/biller').expect(200);
      expect(res.body.data.some((b: { id: string }) => b.id === billerId)).toBe(true);
    });

    it('GET /api/v1/bill-payment/biller/:id', async () => {
      const res = await authedRequest(app)
        .get(`/api/v1/bill-payment/biller/${billerId}`)
        .expect(200);
      expect(res.body.data.id).toBe(billerId);
    });
  });

  describe('Bill Payment — Bill', () => {
    let billerRepo: Repository<BillerRegistration>;
    let mockBillRepo: Repository<MockBill>;
    const billerCode = `BILL-FETCH-${Date.now()}`;
    const consumerNumber = '123456789012';
    const registeredMobile = '9876543210';

    beforeAll(async () => {
      billerRepo = app.get(getRepositoryToken(BillerRegistration));
      mockBillRepo = app.get(getRepositoryToken(MockBill));

      await billerRepo.save(
        billerRepo.create({
          billerCode,
          billerName: 'Test Water Board',
          category: 'WATER',
          active: true,
        }),
      );
      await mockBillRepo.save(
        mockBillRepo.create({
          billerCode,
          consumerNumber,
          billNumber: `BILL-NO-${Date.now()}`,
          registeredMobile,
          customerName: 'Test Customer',
          amount: 1500.5,
          dueDate: '2026-12-31',
          status: 'UNPAID',
        }),
      );
    });

    it('POST /api/v1/bill-payment/bill/fetch', async () => {
      const res = await authedRequest(app)
        .post('/api/v1/bill-payment/bill/fetch')
        .send({ billerCode, consumerNumber, registeredMobile })
        .expect(201);
      expect(Number(res.body.data.amount)).toBe(1500.5);
      expect(res.body.data.status).toBe('UNPAID');
    });

    it('POST /api/v1/bill-payment/bill/fetch returns 404 for an unknown bill', async () => {
      await authedRequest(app)
        .post('/api/v1/bill-payment/bill/fetch')
        .send({ billerCode, consumerNumber: '999999999999', registeredMobile })
        .expect(404);
    });

    it('POST /api/v1/bill-payment/bill/fetch returns 404 for an unknown biller', async () => {
      await authedRequest(app)
        .post('/api/v1/bill-payment/bill/fetch')
        .send({ billerCode: 'NON_EXISTENT_BILLER', consumerNumber, registeredMobile })
        .expect(404);
    });
  });

  describe('Bill Payment — Payment', () => {
    let billerRepo: Repository<BillerRegistration>;
    let mockBillRepo: Repository<MockBill>;

    beforeAll(() => {
      billerRepo = app.get(getRepositoryToken(BillerRegistration));
      mockBillRepo = app.get(getRepositoryToken(MockBill));
    });

    beforeEach(() => {
      mockBbpsAdapter.pay.mockClear();
    });

    async function seedBill(prefix: string, amount: number) {
      const billerCode = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      const consumerNumber = String(Math.floor(1e11 + Math.random() * 8e11));
      await billerRepo.save(
        billerRepo.create({
          billerCode,
          billerName: 'Test Gas Board',
          category: 'GAS',
          active: true,
        }),
      );
      await mockBillRepo.save(
        mockBillRepo.create({
          billerCode,
          consumerNumber,
          billNumber: `BILL-NO-${Date.now()}`,
          registeredMobile: '9876500000',
          customerName: 'Payment Test Customer',
          amount,
          dueDate: '2026-12-31',
          status: 'UNPAID',
        }),
      );
      return { billerCode, consumerNumber };
    }

    let paymentId: string;
    let listedBillerCode: string;

    it('POST /api/v1/bill-payment/payment succeeds and marks the bill PAID', async () => {
      const { billerCode, consumerNumber } = await seedBill('PAY-OK', 2000);
      listedBillerCode = billerCode;
      mockBbpsAdapter.pay.mockResolvedValueOnce({
        status: 'SUCCESS',
        referenceId: 'TEST-BBPS-REF-1',
      });

      const res = await authedRequest(app)
        .post('/api/v1/bill-payment/payment')
        .send({
          billerCode,
          consumerNumber,
          amount: '2000.00',
          idempotencyKey: `idem-success-${Date.now()}`,
        })
        .expect(201);

      expect(res.body.data.status).toBe('SUCCESS');
      expect(res.body.data.bbpsReferenceId).toBe('TEST-BBPS-REF-1');
      expect(mockBbpsAdapter.pay).toHaveBeenCalledTimes(1);
      paymentId = res.body.data.paymentId;

      const bill = await mockBillRepo.findOne({ where: { billerCode, consumerNumber } });
      expect(bill?.status).toBe('PAID');
    });

    it('POST /api/v1/bill-payment/payment rejects an amount mismatch', async () => {
      const { billerCode, consumerNumber } = await seedBill('PAY-MISMATCH', 2000);
      await authedRequest(app)
        .post('/api/v1/bill-payment/payment')
        .send({
          billerCode,
          consumerNumber,
          amount: '1.00',
          idempotencyKey: `idem-mismatch-${Date.now()}`,
        })
        .expect(400);
    });

    it('POST /api/v1/bill-payment/payment returns 404 for an unmatched bill', async () => {
      await authedRequest(app)
        .post('/api/v1/bill-payment/payment')
        .send({
          billerCode: 'NON_EXISTENT_BILLER',
          consumerNumber: '000000000000',
          amount: '10.00',
          idempotencyKey: `idem-missing-${Date.now()}`,
        })
        .expect(404);
    });

    it('POST /api/v1/bill-payment/payment replays an idempotent request without re-calling BBPS', async () => {
      const { billerCode, consumerNumber } = await seedBill('PAY-IDEM', 500);
      const idempotencyKey = `idem-replay-${Date.now()}`;
      const body = { billerCode, consumerNumber, amount: '500.00', idempotencyKey };

      const first = await authedRequest(app)
        .post('/api/v1/bill-payment/payment')
        .send(body)
        .expect(201);
      expect(first.body.data.duplicate).toBeFalsy();

      const second = await authedRequest(app)
        .post('/api/v1/bill-payment/payment')
        .send(body)
        .expect(201);
      expect(second.body.data.duplicate).toBe(true);
      expect(second.body.data.paymentId).toBe(first.body.data.paymentId);
      expect(mockBbpsAdapter.pay).toHaveBeenCalledTimes(1);
    });

    it('POST /api/v1/bill-payment/payment rejects a reused idempotency key for a different payment', async () => {
      const { billerCode, consumerNumber } = await seedBill('PAY-REUSE', 300);
      const idempotencyKey = `idem-reuse-${Date.now()}`;

      await authedRequest(app)
        .post('/api/v1/bill-payment/payment')
        .send({ billerCode, consumerNumber, amount: '300.00', idempotencyKey })
        .expect(201);

      await authedRequest(app)
        .post('/api/v1/bill-payment/payment')
        .send({ billerCode, consumerNumber, amount: '999.00', idempotencyKey })
        .expect(400);
    });

    it('GET /api/v1/bill-payment/payment', async () => {
      const res = await authedRequest(app).get('/api/v1/bill-payment/payment').expect(200);
      expect(res.body.data.some((p: { id: string }) => p.id === paymentId)).toBe(true);
    });

    it('GET /api/v1/bill-payment/payment/:id', async () => {
      const res = await authedRequest(app)
        .get(`/api/v1/bill-payment/payment/${paymentId}`)
        .expect(200);
      expect(res.body.data.id).toBe(paymentId);
      expect(res.body.data.billerCode).toBe(listedBillerCode);
    });
  });
});
