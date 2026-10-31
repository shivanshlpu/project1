import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { DatabaseModule } from '../../database/database.module';
import { DatabaseService } from '../../database/database.service';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JWT_SECRET } from './jwt.strategy';

describe('AuthService (Node 1 DoD Verification)', () => {
  let service: AuthService;
  let db: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        DatabaseModule,
        JwtModule.register({
          secret: JWT_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
    db = module.get<DatabaseService>(DatabaseService);
    await db.onModuleInit(); 
  });

  it('should login successfully with valid email and password', async () => {
    const res = (await service.login({
      identifier: 'shivanshti10@gmail.com',
      password: '12345678',
    })) as any;

    expect(res).toBeDefined();
    expect(res.access_token).toBeDefined();
    expect(res.refresh_token).toBeDefined();
    expect(res.user.role).toBe('SUPER_ADMIN');
    expect(res.user.email).toBe('shivanshti10@gmail.com');
  });

  it('should reject login with wrong password', async () => {
    await expect(
      service.login({
        identifier: 'shivanshti10@gmail.com',
        password: 'WrongPassword',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should request and verify OTP for MR phone', async () => {
    const otpReq = await service.requestOtp({ phone: '9876543212' });
    expect(otpReq.message).toContain('OTP sent');
    expect(otpReq.debug_otp).toBe('123456');

    const verifyRes = await service.verifyOtp({
      phone: '9876543212',
      otp: '123456',
    });
    expect(verifyRes.access_token).toBeDefined();
    expect(verifyRes.user.role).toBe('MR');
  });

  it('should rotate refresh token and invalidate previous refresh token', async () => {
    const initialLogin = (await service.login({
      identifier: 'mr@ahtri.com',
      password: 'Password@123',
    })) as any;

    const oldRefreshToken = initialLogin.refresh_token;
    expect(db.refreshTokens.has(oldRefreshToken)).toBe(true);

    const refreshRes = await service.refresh({ refreshToken: oldRefreshToken });
    expect(refreshRes.access_token).toBeDefined();
    expect(refreshRes.refresh_token).toBeDefined();
    expect(refreshRes.refresh_token).not.toBe(oldRefreshToken);

    
    expect(db.refreshTokens.has(oldRefreshToken)).toBe(false);

    
    await expect(service.refresh({ refreshToken: oldRefreshToken })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should clear refresh token on logout', async () => {
    const login = (await service.login({
      identifier: 'manager@ahtri.com',
      password: 'Password@123',
    })) as any;

    const token = login.refresh_token;
    expect(db.refreshTokens.has(token)).toBe(true);

    await service.logout(token);
    expect(db.refreshTokens.has(token)).toBe(false);
  });

  it('should bind device ID on first MR login and reject subsequent login from different device', async () => {
    
    const login1 = (await service.login({
      identifier: 'mr@ahtri.com',
      password: 'Password@123',
      device_id: 'device-phone-A',
      device_model: 'Samsung Galaxy S22',
      phone: '9876543212',
    })) as any;

    expect(login1.access_token).toBeDefined();
    expect(login1.user.device_id).toBe('device-phone-A');

    
    const mrUser = db.users.find((u) => u.id === 'usr-mr-01');
    expect(mrUser?.device_id).toBe('device-phone-A');
    expect(mrUser?.device_bound_at).toBeDefined();

    
    const loginSameDevice = (await service.login({
      identifier: 'mr@ahtri.com',
      password: 'Password@123',
      device_id: 'device-phone-A',
    })) as any;
    expect(loginSameDevice.access_token).toBeDefined();

    
    await expect(
      service.login({
        identifier: 'mr@ahtri.com',
        password: 'Password@123',
        device_id: 'device-phone-B-UNAUTHORIZED',
      }),
    ).rejects.toThrow(ForbiddenException);

    
    await expect(
      service.login({
        identifier: 'mr@ahtri.com',
        password: 'Password@123',
        device_id: 'device-phone-A',
        phone: '9999999999',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should maintain device lock after logout, block second phone, and pair new phone after admin reset', async () => {
    // 1. Initial login on Device 1
    const login1 = (await service.login({
      identifier: 'mr@ahtri.com',
      password: 'Password@123',
      device_id: 'device-phone-1',
      device_model: 'OnePlus 11',
    })) as any;
    expect(login1.access_token).toBeDefined();

    // 2. Second device attempts to login -> BLOCKED
    await expect(
      service.login({
        identifier: 'mr@ahtri.com',
        password: 'Password@123',
        device_id: 'device-phone-2',
        device_model: 'Samsung Galaxy S22',
      }),
    ).rejects.toThrow(ForbiddenException);

    // 3. User logs out on Device 1
    await service.logout(login1.refresh_token, 'usr-mr-01');

    // 4. Second device STILL BLOCKED even after Device 1 logged out
    await expect(
      service.login({
        identifier: 'mr@ahtri.com',
        password: 'Password@123',
        device_id: 'device-phone-2',
        device_model: 'Samsung Galaxy S22',
      }),
    ).rejects.toThrow(ForbiddenException);

    // 5. Device 1 can still login without issue
    const loginDevice1Again = (await service.login({
      identifier: 'mr@ahtri.com',
      password: 'Password@123',
      device_id: 'device-phone-1',
    })) as any;
    expect(loginDevice1Again.access_token).toBeDefined();

    // 6. Admin resets device lock
    const resetRes = await service.resetDeviceBinding('usr-mr-01');
    expect(resetRes.success).toBe(true);

    const mrUser = db.users.find((u) => u.id === 'usr-mr-01');
    expect(mrUser?.device_id).toBeUndefined();

    // 7. Device 2 can now login and becomes the new locked phone!
    const loginDevice2 = (await service.login({
      identifier: 'mr@ahtri.com',
      password: 'Password@123',
      device_id: 'device-phone-2',
      device_model: 'Samsung Galaxy S22',
    })) as any;
    expect(loginDevice2.access_token).toBeDefined();
    expect(mrUser?.device_id).toBe('device-phone-2');
    expect(mrUser?.device_model).toBe('Samsung Galaxy S22');

    // 8. Device 1 is now blocked because Device 2 is the locked phone
    await expect(
      service.login({
        identifier: 'mr@ahtri.com',
        password: 'Password@123',
        device_id: 'device-phone-1',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
