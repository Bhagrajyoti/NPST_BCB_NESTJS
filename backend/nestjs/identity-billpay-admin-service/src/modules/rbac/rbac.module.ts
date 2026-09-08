import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { EmployeesController } from './controllers/employees.controller';
import { PermissionsController } from './controllers/permissions.controller';
import { RolesController } from './controllers/roles.controller';
import { UsersController } from './controllers/users.controller';
import { DelegatedRole } from './entities/delegated-role.entity';
import { EmployeeUserRole } from './entities/employee-user-role.entity';
import { Employee } from './entities/employee.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { Role } from './entities/role.entity';
import { SuperadminGuard } from './guards/superadmin.guard';
import { EmployeesService } from './services/employees.service';
import { PermissionsService } from './services/permissions.service';
import { RolesService } from './services/roles.service';
import { UsersAccessService } from './services/users-access.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Role,
      Permission,
      RolePermission,
      Employee,
      EmployeeUserRole,
      DelegatedRole,
    ]),
  ],
  controllers: [
    RolesController,
    PermissionsController,
    EmployeesController,
    UsersController,
  ],
  providers: [
    RolesService,
    PermissionsService,
    EmployeesService,
    UsersAccessService,
    SuperadminGuard,
  ],
})
export class RbacModule {}
