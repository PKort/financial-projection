import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from './prisma.service';

export type AuthenticatedUser = {
  id: number;
  username: string;
  role: string;
  isActive: boolean;
};

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private publicUser(user: AuthenticatedUser) {
    return { id: user.id, username: user.username, role: user.role, isActive: user.isActive };
  }

  private normalizeUsername(username: string) {
    const normalizedUsername = username?.trim();
    if (!normalizedUsername || !/^[a-zA-Z0-9._-]{3,191}$/.test(normalizedUsername)) {
      throw new BadRequestException('Nazwa użytkownika może zawierać litery, cyfry, kropki, podkreślenia i myślniki (min. 3 znaki).');
    }
    return normalizedUsername;
  }

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Nieprawidłowa nazwa użytkownika lub hasło.');
    }

    const token = randomBytes(32).toString('base64url');
    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      },
    });

    return { token, user: this.publicUser(user) };
  }

  async authenticate(token: string): Promise<AuthenticatedUser> {
    const session = await this.prisma.userSession.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { user: true },
    });

    if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
      throw new UnauthorizedException('Sesja wygasła lub konto jest zablokowane.');
    }

    return this.publicUser(session.user);
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    if (newPassword.length < 8) {
      throw new ForbiddenException('Hasło musi mieć co najmniej 8 znaków.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Obecne hasło jest nieprawidłowe.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: await bcrypt.hash(newPassword, 12) },
      }),
      this.prisma.userSession.deleteMany({ where: { userId } }),
    ]);
  }

  async logout(token: string) {
    await this.prisma.userSession.deleteMany({ where: { tokenHash: this.hashToken(token) } });
  }

  async createUser(username: string, password: string, role = 'USER') {
    const normalizedUsername = this.normalizeUsername(username);
    if (password.length < 8) {
      throw new BadRequestException('Hasło musi mieć co najmniej 8 znaków.');
    }
    if (!['USER', 'ADMIN'].includes(role)) {
      throw new BadRequestException('Nieprawidłowa rola użytkownika.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const existingUser = await this.prisma.user.findUnique({ where: { username: normalizedUsername } });
    if (existingUser) throw new ConflictException('Użytkownik o tej nazwie już istnieje.');

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { username: normalizedUsername, passwordHash, role },
      });
      await tx.globalSettings.create({ data: { userId: created.id, key: 'daily_budget', value: '130' } });
      const systemGroup = await tx.transactionGroup.create({
        data: { userId: created.id, code: 'system', name: 'Systemowe', sortOrder: 1000, isSystem: true },
      });
      await tx.transactionSubgroup.create({
        data: {
          userId: created.id,
          transactionGroupId: systemGroup.id,
          code: 'credit-card-repayment',
          name: 'Spłata karty kredytowej',
          sortOrder: 10,
          isSystem: true,
        },
      });
      return created;
    });
    return this.publicUser(user);
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({ orderBy: { username: 'asc' } });
    return users.map((user) => this.publicUser(user));
  }

  async updateUser(
    userId: number,
    data: { username?: string; isActive?: boolean; role?: string; password?: string },
    actingUserId: number,
  ) {
    const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) throw new NotFoundException('Nie znaleziono użytkownika.');
    if (userId === actingUserId && (data.isActive === false || (data.role !== undefined && data.role !== 'ADMIN'))) {
      throw new BadRequestException('Nie możesz wygasić własnego konta administratora ani odebrać mu uprawnień.');
    }
    if (data.role !== undefined && !['USER', 'ADMIN'].includes(data.role)) {
      throw new BadRequestException('Nieprawidłowa rola użytkownika.');
    }
    if (data.password !== undefined && data.password.length < 8) {
      throw new BadRequestException('Hasło musi mieć co najmniej 8 znaków.');
    }

    const updateData: Record<string, unknown> = {};
    if (data.username !== undefined) {
      const username = this.normalizeUsername(data.username);
      const duplicate = await this.prisma.user.findFirst({ where: { username, id: { not: userId } } });
      if (duplicate) throw new ConflictException('Użytkownik o tej nazwie już istnieje.');
      updateData.username = username;
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.password !== undefined) updateData.passwordHash = await bcrypt.hash(data.password, 12);
    const user = await this.prisma.user.update({ where: { id: userId }, data: updateData });
    if (data.password !== undefined || data.isActive === false) {
      await this.prisma.userSession.deleteMany({ where: { userId } });
    }
    return this.publicUser(user);
  }
}
