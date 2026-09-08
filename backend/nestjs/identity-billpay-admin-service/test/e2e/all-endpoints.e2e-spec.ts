import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  authedRequest,
  createTestApp,
  mockKeycloakService,
  publicRequest,
} from './helpers/test-app';

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
      expect(res.body.status).toBe('ok');
    });
  });

  describe('Auth — Session', () => {
    it('POST /api/v1/auth/login', async () => {
      const res = await publicRequest(app)
        .post('/api/v1/auth/login')
        .send({ username: 'api-test-user', password: 'ApiTest@123' })
        .expect(201);
      expect(res.body.accessToken).toBe('test-access-token');
      expect(mockKeycloakService.login).toHaveBeenCalled();
    });

    it('POST /api/v1/auth/logout', async () => {
      const res = await publicRequest(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'test-refresh-token', clientId: 'admin-web' })
        .expect(201);
      expect(res.body.loggedOut).toBe(true);
    });

    it('POST /api/v1/auth/session/me', async () => {
      const res = await authedRequest(app).post('/api/v1/auth/session/me').expect(201);
      expect(res.body.user).toBeDefined();
    });
  });

  describe('Auth — Registration', () => {
    it('POST /api/v1/auth/registration/list', async () => {
      await authedRequest(app).post('/api/v1/auth/registration/list').expect(201);
    });

    it('POST /api/v1/auth/registration/create', async () => {
      const res = await publicRequest(app)
        .post('/api/v1/auth/registration/create')
        .send({ mobileNumber: '9876543210', panOrCif: 'CIF12345' })
        .expect(201);
      expect(res.body.id).toBeDefined();
    });

    it('POST /api/v1/auth/registration/get', async () => {
      const created = await publicRequest(app)
        .post('/api/v1/auth/registration/create')
        .send({ mobileNumber: '9876543211', panOrCif: 'CIF12346' });

      await authedRequest(app)
        .post('/api/v1/auth/registration/get')
        .send({ id: created.body.id })
        .expect(201);
    });

    it('POST /api/v1/auth/registration/delete', async () => {
      const created = await publicRequest(app)
        .post('/api/v1/auth/registration/create')
        .send({ mobileNumber: '9876543212', panOrCif: 'CIF12347' });

      const res = await authedRequest(app)
        .post('/api/v1/auth/registration/delete')
        .send({ id: created.body.id })
        .expect(201);
      expect(res.body.deleted).toBe(true);
    });
  });

  describe('Auth — Credential', () => {
    it('POST /api/v1/auth/credential/list', async () => {
      await authedRequest(app).post('/api/v1/auth/credential/list').expect(201);
    });

    it('POST /api/v1/auth/credential/create', async () => {
      const res = await authedRequest(app)
        .post('/api/v1/auth/credential/create')
        .send({ userId: randomUUID(), password: 'TestPass@123' })
        .expect(201);
      expect(res.body.id).toBeDefined();
    });

    it('POST /api/v1/auth/credential/get', async () => {
      const created = await authedRequest(app)
        .post('/api/v1/auth/credential/create')
        .send({ userId: randomUUID(), password: 'TestPass@123' });

      await authedRequest(app)
        .post('/api/v1/auth/credential/get')
        .send({ id: created.body.id })
        .expect(201);
    });

    it('POST /api/v1/auth/credential/delete', async () => {
      const created = await authedRequest(app)
        .post('/api/v1/auth/credential/create')
        .send({ userId: randomUUID(), password: 'TestPass@123' });

      const res = await authedRequest(app)
        .post('/api/v1/auth/credential/delete')
        .send({ id: created.body.id })
        .expect(201);
      expect(res.body.deleted).toBe(true);
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
      expect(res.body.id).toBeDefined();
    });

    it('POST /api/v1/auth/device/get', async () => {
      const created = await authedRequest(app)
        .post('/api/v1/auth/device/create')
        .send({ userId: randomUUID(), deviceId: `device-get-${Date.now()}` });

      await authedRequest(app)
        .post('/api/v1/auth/device/get')
        .send({ id: created.body.id })
        .expect(201);
    });

    it('POST /api/v1/auth/device/delete', async () => {
      const created = await authedRequest(app)
        .post('/api/v1/auth/device/create')
        .send({ userId: randomUUID(), deviceId: `device-del-${Date.now()}` });

      const res = await authedRequest(app)
        .post('/api/v1/auth/device/delete')
        .send({ id: created.body.id })
        .expect(201);
      expect(res.body.deleted).toBe(true);
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
      expect(res.body.id).toBeDefined();
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
        .send({ id: created.body.id })
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
        .send({ id: created.body.id })
        .expect(201);
      expect(res.body.deleted).toBe(true);
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
      expect(res.body.id).toBeDefined();
    });

    it('POST /api/v1/auth/otp/get', async () => {
      const created = await publicRequest(app)
        .post('/api/v1/auth/otp/create')
        .send({ mobileNumber: '9998887775' });

      await authedRequest(app)
        .post('/api/v1/auth/otp/get')
        .send({ id: created.body.id })
        .expect(201);
    });

    it('POST /api/v1/auth/otp/delete', async () => {
      const created = await publicRequest(app)
        .post('/api/v1/auth/otp/create')
        .send({ mobileNumber: '9998887774' });

      const res = await authedRequest(app)
        .post('/api/v1/auth/otp/delete')
        .send({ id: created.body.id })
        .expect(201);
      expect(res.body.deleted).toBe(true);
    });
  });

  describe('RBAC — Permissions', () => {
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
      expect(res.body.code).toBe(code);
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
      permissionId = permission.body.id;
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
      expect(res.body.name).toBe(roleName);
      roleId = res.body.id;
      expect(mockKeycloakService.createRealmRole).toHaveBeenCalled();
    });

    it('POST /api/v1/roles/map-permissions', async () => {
      const res = await authedRequest(app)
        .post('/api/v1/roles/map-permissions')
        .send({ roleId, permissionIds: [permissionId] })
        .expect(201);
      expect(res.body.permissions).toHaveLength(1);
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
      expect(res.body.displayName).toBe('Updated Test Role');
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
          roleId: role.body.id,
          employeeCode: `EMP-${suffix}`,
        })
        .expect(201);
      expect(res.body.employee.keycloakUserId).toBeDefined();
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
          roleId: roleA.body.id,
        })
        .expect(201);

      const res = await authedRequest(app)
        .post('/api/v1/employees/update-role')
        .send({
          employeeId: created.body.employee.id,
          roleId: roleB.body.id,
        })
        .expect(201);

      expect(res.body.role.id).toBe(roleB.body.id);
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
          roleId: superRole.body.id,
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
          employeeId: employee.body.employee.id,
          roleId: makerRole.body.id,
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
          roleId: makerRole.body.id,
        })
        .expect(201);

      const res = await authedRequest(bankAdminApp)
        .post('/api/v1/employees/update-role')
        .send({
          employeeId: employee.body.employee.id,
          roleId: lowRole.body.id,
        })
        .expect(201);

      expect(res.body.role.id).toBe(lowRole.body.id);
    });
  });

  describe('RBAC — Users', () => {
    it('POST /api/v1/users/fetch-access-details', async () => {
      const res = await authedRequest(app)
        .post('/api/v1/users/fetch-access-details')
        .send({})
        .expect(201);
      expect(res.body).toHaveProperty('count');
      expect(res.body).toHaveProperty('users');
    });
  });
});
