import { Body, Controller, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Controller('api/admin/users')
@UseGuards(AuthGuard)
export class AdminUsersController {
  constructor(private authService: AuthService) {}

  private requireAdmin(request: any) {
    if (request.user.role !== 'ADMIN') {
      throw new ForbiddenException('Ta operacja wymaga uprawnień administratora.');
    }
  }

  @Get()
  list(@Req() request: any) {
    this.requireAdmin(request);
    return this.authService.listUsers();
  }

  @Post()
  create(@Req() request: any, @Body() body: { username: string; password: string; role?: string }) {
    this.requireAdmin(request);
    return this.authService.createUser(body.username, body.password ?? '', body.role ?? 'USER');
  }

  @Patch(':id')
  update(
    @Req() request: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { isActive?: boolean; role?: string; password?: string },
  ) {
    this.requireAdmin(request);
    return this.authService.updateUser(id, body);
  }
}
