import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BillScheduleExecution } from '../../src/modules/bill-payment/scheduling/entities/bill-schedule-execution.entity';
import { BillSchedule } from '../../src/modules/bill-payment/scheduling/entities/bill-schedule.entity';
import { ScheduleStatus } from '../../src/modules/bill-payment/scheduling/schedule-status.constant';
import {
  authedRequest,
  createTestApp,
  publicRequest,
  TEST_CORPORATE_VIEWER,
  TEST_RETAIL_CUSTOMER,
  TEST_RETAIL_CUSTOMER_B,
} from './helpers/test-app';

function offsetIsoDate(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

describe('Bill Payment — Schedule extensions (e2e)', () => {
  async function createSchedule(
    app: INestApplication,
    nextRunAt: string,
    scheduleType: 'ONE_TIME' | 'RECURRING' = 'RECURRING',
  ) {
    const body: Record<string, unknown> = {
      billerCode: 'ELEC-MSEDCL-01',
      consumerNumber: '100000000001',
      scheduleType,
      nextRunAt,
      maximumAmount: 5000,
    };
    if (scheduleType === 'RECURRING') {
      body.frequency = 'MONTHLY';
    }
    return authedRequest(app).post('/api/v1/bill-payment/schedule').send(body).expect(201);
  }

  describe('POST /schedule/:id/pause', () => {
    it('owner ACTIVE schedule -> 200 PAUSED', async () => {
      const app = await createTestApp(TEST_RETAIL_CUSTOMER);
      const created = await createSchedule(app, offsetIsoDate(10));
      const id = created.body.data.id as string;

      const res = await authedRequest(app)
        .post(`/api/v1/bill-payment/schedule/${id}/pause`)
        .expect(201);
      expect(res.body.data.status).toBe(ScheduleStatus.PAUSED);
      expect(res.body.data.active).toBe(false);
      await app.close();
    });

    it('already PAUSED -> 400', async () => {
      const app = await createTestApp(TEST_RETAIL_CUSTOMER);
      const created = await createSchedule(app, offsetIsoDate(10));
      const id = created.body.data.id as string;
      await authedRequest(app).post(`/api/v1/bill-payment/schedule/${id}/pause`).expect(201);
      await authedRequest(app).post(`/api/v1/bill-payment/schedule/${id}/pause`).expect(400);
      await app.close();
    });

    it('non-owner -> 404', async () => {
      const ownerApp = await createTestApp(TEST_RETAIL_CUSTOMER);
      const otherApp = await createTestApp(TEST_RETAIL_CUSTOMER_B);
      const created = await createSchedule(ownerApp, offsetIsoDate(10));
      const id = created.body.data.id as string;
      await authedRequest(otherApp).post(`/api/v1/bill-payment/schedule/${id}/pause`).expect(404);
      await ownerApp.close();
      await otherApp.close();
    });

    it('unauthenticated -> 401', async () => {
      const app = await createTestApp(TEST_RETAIL_CUSTOMER);
      const created = await createSchedule(app, offsetIsoDate(10));
      const id = created.body.data.id as string;
      await publicRequest(app)
        .post(`/api/v1/bill-payment/schedule/${id}/pause`)
        .expect(401);
      await app.close();
    });

    it('unauthorized role -> 403', async () => {
      const viewerApp = await createTestApp(TEST_CORPORATE_VIEWER);
      const ownerApp = await createTestApp(TEST_RETAIL_CUSTOMER);
      const created = await createSchedule(ownerApp, offsetIsoDate(10));
      const id = created.body.data.id as string;
      await authedRequest(viewerApp).post(`/api/v1/bill-payment/schedule/${id}/pause`).expect(403);
      await viewerApp.close();
      await ownerApp.close();
    });
  });

  describe('POST /schedule/:id/resume', () => {
    it('owner PAUSED schedule -> 200 ACTIVE', async () => {
      const app = await createTestApp(TEST_RETAIL_CUSTOMER);
      const created = await createSchedule(app, offsetIsoDate(10));
      const id = created.body.data.id as string;
      await authedRequest(app).post(`/api/v1/bill-payment/schedule/${id}/pause`).expect(201);

      const res = await authedRequest(app)
        .post(`/api/v1/bill-payment/schedule/${id}/resume`)
        .expect(201);
      expect(res.body.data.status).toBe(ScheduleStatus.ACTIVE);
      await app.close();
    });

    it('ACTIVE schedule -> 400', async () => {
      const app = await createTestApp(TEST_RETAIL_CUSTOMER);
      const created = await createSchedule(app, offsetIsoDate(10));
      const id = created.body.data.id as string;
      await authedRequest(app).post(`/api/v1/bill-payment/schedule/${id}/resume`).expect(400);
      await app.close();
    });

    it('non-owner -> 404', async () => {
      const ownerApp = await createTestApp(TEST_RETAIL_CUSTOMER);
      const otherApp = await createTestApp(TEST_RETAIL_CUSTOMER_B);
      const created = await createSchedule(ownerApp, offsetIsoDate(10));
      const id = created.body.data.id as string;
      await authedRequest(ownerApp).post(`/api/v1/bill-payment/schedule/${id}/pause`).expect(201);
      await authedRequest(otherApp).post(`/api/v1/bill-payment/schedule/${id}/resume`).expect(404);
      await ownerApp.close();
      await otherApp.close();
    });

    it('unauthenticated -> 401', async () => {
      const app = await createTestApp(TEST_RETAIL_CUSTOMER);
      const created = await createSchedule(app, offsetIsoDate(10));
      const id = created.body.data.id as string;
      await publicRequest(app)
        .post(`/api/v1/bill-payment/schedule/${id}/resume`)
        .expect(401);
      await app.close();
    });

    it('unauthorized role -> 403', async () => {
      const viewerApp = await createTestApp(TEST_CORPORATE_VIEWER);
      const ownerApp = await createTestApp(TEST_RETAIL_CUSTOMER);
      const created = await createSchedule(ownerApp, offsetIsoDate(10));
      const id = created.body.data.id as string;
      await authedRequest(viewerApp).post(`/api/v1/bill-payment/schedule/${id}/resume`).expect(403);
      await viewerApp.close();
      await ownerApp.close();
    });
  });

  describe('POST /schedule/:id/cancel', () => {
    it('owner ACTIVE -> 200 CANCELLED', async () => {
      const app = await createTestApp(TEST_RETAIL_CUSTOMER);
      const created = await createSchedule(app, offsetIsoDate(10));
      const id = created.body.data.id as string;
      const res = await authedRequest(app)
        .post(`/api/v1/bill-payment/schedule/${id}/cancel`)
        .expect(201);
      expect(res.body.data.status).toBe(ScheduleStatus.CANCELLED);
      await app.close();
    });

    it('owner PAUSED -> 200 CANCELLED', async () => {
      const app = await createTestApp(TEST_RETAIL_CUSTOMER);
      const created = await createSchedule(app, offsetIsoDate(10));
      const id = created.body.data.id as string;
      await authedRequest(app).post(`/api/v1/bill-payment/schedule/${id}/pause`).expect(201);
      const res = await authedRequest(app)
        .post(`/api/v1/bill-payment/schedule/${id}/cancel`)
        .expect(201);
      expect(res.body.data.status).toBe(ScheduleStatus.CANCELLED);
      await app.close();
    });

    it('already CANCELLED -> 400', async () => {
      const app = await createTestApp(TEST_RETAIL_CUSTOMER);
      const created = await createSchedule(app, offsetIsoDate(10));
      const id = created.body.data.id as string;
      await authedRequest(app).post(`/api/v1/bill-payment/schedule/${id}/cancel`).expect(201);
      await authedRequest(app).post(`/api/v1/bill-payment/schedule/${id}/cancel`).expect(400);
      await app.close();
    });

    it('non-owner -> 404', async () => {
      const ownerApp = await createTestApp(TEST_RETAIL_CUSTOMER);
      const otherApp = await createTestApp(TEST_RETAIL_CUSTOMER_B);
      const created = await createSchedule(ownerApp, offsetIsoDate(10));
      const id = created.body.data.id as string;
      await authedRequest(otherApp).post(`/api/v1/bill-payment/schedule/${id}/cancel`).expect(404);
      await ownerApp.close();
      await otherApp.close();
    });

    it('unauthenticated -> 401', async () => {
      const app = await createTestApp(TEST_RETAIL_CUSTOMER);
      const created = await createSchedule(app, offsetIsoDate(10));
      const id = created.body.data.id as string;
      await publicRequest(app)
        .post(`/api/v1/bill-payment/schedule/${id}/cancel`)
        .expect(401);
      await app.close();
    });

    it('unauthorized role -> 403', async () => {
      const viewerApp = await createTestApp(TEST_CORPORATE_VIEWER);
      const ownerApp = await createTestApp(TEST_RETAIL_CUSTOMER);
      const created = await createSchedule(ownerApp, offsetIsoDate(10));
      const id = created.body.data.id as string;
      await authedRequest(viewerApp).post(`/api/v1/bill-payment/schedule/${id}/cancel`).expect(403);
      await viewerApp.close();
      await ownerApp.close();
    });
  });

  describe('GET /schedule/:id/executions', () => {
    it('owner retrieves execution history newest first', async () => {
      const app = await createTestApp(TEST_RETAIL_CUSTOMER);
      const created = await createSchedule(app, offsetIsoDate(10));
      const scheduleId = created.body.data.id as string;
      const execRepo = app.get<Repository<BillScheduleExecution>>(
        getRepositoryToken(BillScheduleExecution),
      );

      const older = execRepo.create({
        scheduleId,
        billNumber: 'BBPS-ELEC-001',
        billAmount: 100,
        maximumAmount: 5000,
        status: 'FAILED',
        attemptCount: 1,
        failureReason: 'timeout',
        startedAt: new Date('2026-01-01T10:00:00.000Z'),
        completedAt: new Date('2026-01-01T10:05:00.000Z'),
      });
      const newer = execRepo.create({
        scheduleId,
        billNumber: 'BBPS-ELEC-001',
        billAmount: 100,
        maximumAmount: 5000,
        status: 'SUCCESS',
        attemptCount: 1,
        paymentId: 'pay-uuid-1',
        startedAt: new Date('2026-02-01T10:00:00.000Z'),
        completedAt: new Date('2026-02-01T10:01:00.000Z'),
      });
      await execRepo.save(older);
      await execRepo.save(newer);

      const res = await authedRequest(app)
        .get(`/api/v1/bill-payment/schedule/${scheduleId}/executions`)
        .expect(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].status).toBe('SUCCESS');
      expect(res.body.data[1].status).toBe('FAILED');
      await app.close();
    });

    it('non-owner -> 404', async () => {
      const ownerApp = await createTestApp(TEST_RETAIL_CUSTOMER);
      const otherApp = await createTestApp(TEST_RETAIL_CUSTOMER_B);
      const created = await createSchedule(ownerApp, offsetIsoDate(10));
      const scheduleId = created.body.data.id as string;
      await authedRequest(otherApp)
        .get(`/api/v1/bill-payment/schedule/${scheduleId}/executions`)
        .expect(404);
      await ownerApp.close();
      await otherApp.close();
    });

    it('empty history -> []', async () => {
      const app = await createTestApp(TEST_RETAIL_CUSTOMER);
      const created = await createSchedule(app, offsetIsoDate(10));
      const scheduleId = created.body.data.id as string;
      const res = await authedRequest(app)
        .get(`/api/v1/bill-payment/schedule/${scheduleId}/executions`)
        .expect(200);
      expect(res.body.data).toEqual([]);
      await app.close();
    });

    it('unauthorized role -> 403', async () => {
      const viewerApp = await createTestApp(TEST_CORPORATE_VIEWER);
      await authedRequest(viewerApp)
        .get('/api/v1/bill-payment/schedule/00000000-0000-0000-0000-000000000001/executions')
        .expect(403);
      await viewerApp.close();
    });

    it('unauthenticated -> 401', async () => {
      const app = await createTestApp(TEST_RETAIL_CUSTOMER);
      await publicRequest(app)
        .get('/api/v1/bill-payment/schedule/00000000-0000-0000-0000-000000000001/executions')
        .expect(401);
      await app.close();
    });
  });

  describe('GET /schedule/upcoming', () => {
    it('returns only ACTIVE owned schedules with future nextRunAt sorted ascending', async () => {
      const app = await createTestApp(TEST_RETAIL_CUSTOMER);
      const scheduleRepo = app.get<Repository<BillSchedule>>(getRepositoryToken(BillSchedule));

      const near = await createSchedule(app, offsetIsoDate(5));
      const far = await createSchedule(app, offsetIsoDate(20));
      const nearId = near.body.data.id as string;
      const farId = far.body.data.id as string;

      const paused = await createSchedule(app, offsetIsoDate(15));
      await authedRequest(app)
        .post(`/api/v1/bill-payment/schedule/${paused.body.data.id}/pause`)
        .expect(201);

      const cancelled = await createSchedule(app, offsetIsoDate(25));
      await authedRequest(app)
        .post(`/api/v1/bill-payment/schedule/${cancelled.body.data.id}/cancel`)
        .expect(201);

      const past = await createSchedule(app, offsetIsoDate(30));
      await scheduleRepo.update(past.body.data.id, {
        nextRunAt: new Date(offsetIsoDate(-2)),
      });

      const res = await authedRequest(app).get('/api/v1/bill-payment/schedule/upcoming').expect(200);
      const ids = res.body.data.map((row: { id: string }) => row.id);
      expect(ids).toContain(nearId);
      expect(ids).toContain(farId);
      expect(ids.indexOf(nearId)).toBeLessThan(ids.indexOf(farId));
      expect(ids).not.toContain(paused.body.data.id);
      expect(ids).not.toContain(cancelled.body.data.id);
      expect(ids).not.toContain(past.body.data.id);
      expect(res.body.data.every((row: { status: string }) => row.status === ScheduleStatus.ACTIVE)).toBe(
        true,
      );
      await app.close();
    });

    it('does not return another user schedules', async () => {
      const appA = await createTestApp(TEST_RETAIL_CUSTOMER);
      const appB = await createTestApp(TEST_RETAIL_CUSTOMER_B);
      const created = await createSchedule(appA, offsetIsoDate(7));
      const listB = await authedRequest(appB).get('/api/v1/bill-payment/schedule/upcoming').expect(200);
      expect(listB.body.data.some((s: { id: string }) => s.id === created.body.data.id)).toBe(false);
      await appA.close();
      await appB.close();
    });

    it('unauthorized role -> 403', async () => {
      const viewerApp = await createTestApp(TEST_CORPORATE_VIEWER);
      await authedRequest(viewerApp).get('/api/v1/bill-payment/schedule/upcoming').expect(403);
      await viewerApp.close();
    });

    it('unauthenticated -> 401', async () => {
      const app = await createTestApp(TEST_RETAIL_CUSTOMER);
      await publicRequest(app).get('/api/v1/bill-payment/schedule/upcoming').expect(401);
      await app.close();
    });
  });
});
