import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() body: { username: string; password: string }) {
    return this.authService.login(body.username?.trim(), body.password ?? '');
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@Req() request: any) {
    return request.user;
  }

  @UseGuards(AuthGuard)
  @Patch('profile')
  updateProfile(
    @Req() request: any,
    @Body() body: { firstName?: string | null; lastName?: string | null; email?: string | null },
  ) {
    return this.authService.updateProfile(request.user.id, body);
  }

  @UseGuards(AuthGuard)
  @Post('change-password')
  async changePassword(@Req() request: any, @Body() body: { currentPassword: string; newPassword: string }) {
    await this.authService.changePassword(request.user.id, body.currentPassword ?? '', body.newPassword ?? '');
    return { success: true };
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  async logout(@Req() request: any) {
    const token = request.headers.authorization.slice(7);
    await this.authService.logout(token);
    return { success: true };
  }
}
