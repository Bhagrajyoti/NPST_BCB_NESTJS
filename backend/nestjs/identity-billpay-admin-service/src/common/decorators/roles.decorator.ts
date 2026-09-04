import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...values: string[]) => SetMetadata(ROLES_KEY, values);
