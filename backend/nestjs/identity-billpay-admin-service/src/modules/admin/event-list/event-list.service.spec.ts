import { ForbiddenException } from '@nestjs/common';
import { EventListService } from './event-list.service';

describe('EventListService', () => {
  let service: EventListService;
  let outbox: { findRecent: jest.Mock };

  const superAdmin = { sub: 'actor-super', realm_access: { roles: ['BANK_SUPER_ADMIN'] } };
  const bankAdmin = { sub: 'actor-admin', realm_access: { roles: ['BANK_ADMIN'] } };
  const bankMaker = { sub: 'actor-maker', realm_access: { roles: ['BANK_MAKER'] } };

  beforeEach(() => {
    outbox = { findRecent: jest.fn().mockResolvedValue([{ id: 'row-1' }]) };
    service = new EventListService(outbox as any);
  });

  it('rejects BANK_ADMIN — only the super admin may see the event list', () => {
    expect(() => service.findAll({}, bankAdmin)).toThrow(ForbiddenException);
    expect(outbox.findRecent).not.toHaveBeenCalled();
  });

  it('rejects a non-admin role', () => {
    expect(() => service.findAll({}, bankMaker)).toThrow(ForbiddenException);
  });

  it('returns the newest 50 rows when no filters are given', async () => {
    const result = await service.findAll({}, superAdmin);
    expect(outbox.findRecent).toHaveBeenCalledWith({
      eventType: undefined,
      status: undefined,
      limit: 50,
    });
    expect(result).toEqual([{ id: 'row-1' }]);
  });

  it('passes event type, status and limit filters through', async () => {
    await service.findAll(
      { eventType: 'admin.action.audited', status: 'FAILED', limit: 10 },
      superAdmin,
    );
    expect(outbox.findRecent).toHaveBeenCalledWith({
      eventType: 'admin.action.audited',
      status: 'FAILED',
      limit: 10,
    });
  });
});
