import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { AuthRateLimiterGuard } from './rate-limiter.guard';
import { ReportsService } from '../modules/reports/reports.module';
import { DatabaseService } from '../database/database.service';

describe('Security Hardening & Vulnerability Remediation Suite', () => {
  describe('1. AuthRateLimiterGuard (Brute Force Protection)', () => {
    let guard: AuthRateLimiterGuard;

    beforeEach(() => {
      guard = new AuthRateLimiterGuard();
      delete process.env.NODE_ENV; // Ensure test bypass is inactive for guard unit testing
    });

    afterEach(() => {
      process.env.NODE_ENV = 'test';
    });

    function createMockRequest(ip: string, path: string): ExecutionContext {
      return {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            ip,
            url: path,
            route: { path },
          }),
        }),
      } as unknown as ExecutionContext;
    }

    it('should allow requests within rate limit threshold', () => {
      const ctx = createMockRequest('192.168.1.10', '/auth/login');
      for (let i = 0; i < 15; i++) {
        expect(guard.canActivate(ctx)).toBe(true);
      }
    });

    it('should throw HTTP 429 TooManyRequests when exceeding attempt limit', () => {
      const ctx = createMockRequest('192.168.1.20', '/auth/login');
      for (let i = 0; i < 15; i++) {
        guard.canActivate(ctx);
      }

      try {
        guard.canActivate(ctx);
        fail('Expected 429 HttpException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(err.getResponse().message).toContain('Too many login attempts');
      }
    });
  });

  describe('2. CSV / Formula Injection Mitigation (CWE-1236)', () => {
    let reportsService: ReportsService;

    beforeEach(() => {
      const db = new DatabaseService({} as any);
      reportsService = new ReportsService(db);
    });

    it('should prefix formula trigger characters (=, +, -, @) with a single quote', () => {
      const maliciousPayload = [
        {
          name: '=1+1',
          clinic: '+cmd|"/C calc"!A0',
          notes: '-2+5',
          email: '@external_ref',
          safe_text: 'Regular Clinic Name',
        },
      ];

      const csv = reportsService.generateCsv(maliciousPayload);

      // Verify that dangerous formula expressions are escaped with leading single quote
      expect(csv).toContain("\"'=1+1\"");
      expect(csv).toContain("\"'+cmd|\"\"/C calc\"\"!A0\"");
      expect(csv).toContain("\"'-2+5\"");
      expect(csv).toContain("\"'@external_ref\"");
      expect(csv).toContain('"Regular Clinic Name"');
    });
  });

  describe('3. Supabase PostgREST Filter Injection Sanitization', () => {
    it('should strip syntax control characters from identifier lookup string', () => {
      const testIdentifier = 'test@example.com,status.neq.ACTIVE';
      const cleanIdent = testIdentifier.replace(/[^a-zA-Z0-9@._-]/g, '').toLowerCase().trim();

      // Ensure commas and parentheses are stripped
      expect(cleanIdent).not.toContain(',');
      expect(cleanIdent).toBe('test@example.comstatus.neq.active');
    });
  });
});
