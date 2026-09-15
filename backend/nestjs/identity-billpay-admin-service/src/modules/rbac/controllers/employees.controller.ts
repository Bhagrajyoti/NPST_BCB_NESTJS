import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { Auth } from '../../../common/decorators/auth.decorator';
import { CreateEmployeeDto, UpdateEmployeeRoleDto } from '../dto/employee.dto';
import { EmployeesService } from '../services/employees.service';

@ApiTags('RBAC — Employees')
@Auth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post('create')
  @ApiOperation({
    summary: 'Create employee',
    description:
      'Provisions a user in Keycloak and local storage. Superadmins can assign any role below their level; ' +
      'bank admins can assign only delegated roles that are below their hierarchy level.',
  })
  @ApiResponse({ status: 201, description: 'Employee created in Keycloak and local DB' })
  create(@Body() dto: CreateEmployeeDto, @AuthenticatedUser() user: Record<string, unknown>) {
    return this.employeesService.create(dto, user);
  }

  @Post('update-role')
  @ApiOperation({
    summary: 'Update employee role',
    description:
      'Changes the role assigned to an existing employee in both Keycloak and the local database. ' +
      'You cannot modify employees at your hierarchy level or above, and you cannot assign roles at your level or above. ' +
      'Superadmins can manage all employees; bank admins can manage only lower-hierarchy employees with delegated roles.',
  })
  @ApiResponse({ status: 201, description: 'Employee role updated' })
  updateRole(
    @Body() dto: UpdateEmployeeRoleDto,
    @AuthenticatedUser() user: Record<string, unknown>,
  ) {
    return this.employeesService.updateRole(dto, user);
  }
}
