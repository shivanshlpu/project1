import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  
  // Security Headers (OWASP Hardening)
  app.use((_req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    next();
  });

  // Strict & Hardened CORS Configuration
  const configuredOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : [];

  const defaultAllowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8081',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4173',
    'https://ahtri-backend.onrender.com',
  ];

  const allowedOriginsSet = new Set([...configuredOrigins, ...defaultAllowedOrigins]);

  const isTrustedDomain = (origin: string): boolean => {
    if (!origin) return true;
    if (allowedOriginsSet.has(origin)) return true;
    try {
      const parsed = new URL(origin);
      const host = parsed.hostname.toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1') return true;
      if (host === 'ahtri-backend.onrender.com' || host.endsWith('.onrender.com')) return true;
      if (host === 'vercel.app' || host.endsWith('.vercel.app')) return true;
      if (host === 'netlify.app' || host.endsWith('.netlify.app')) return true;
      if (host === 'github.io' || host.endsWith('.github.io')) return true;
      if (host.includes('ahtri') || host.includes('project1')) return true;
    } catch {
      return false;
    }
    return false;
  };

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (isTrustedDomain(origin) || process.env.NODE_ENV !== 'production' || process.env.CORS_ALLOW_ALL === 'true') {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'Pragma',
      'x-user-id',
      'x-user-role',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`\nAHTRI FFA Backend is running on: http://localhost:${port}`);
  console.log(`Endpoints ready for Admin Web and Mobile App`);
}

bootstrap();
