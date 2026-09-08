-- ==============================================================================
-- AHTRI Field Force Automation (FFA) - Supabase / PostgreSQL Database Schema
-- Database Target: Supabase (PostgreSQL 15+)
-- ==============================================================================

-- 1. Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. USERS & ACCESS CONTROL
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'MR' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MR')),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING')),
  zone_id VARCHAR(64),
  region_id VARCHAR(64),
  area_id VARCHAR(64),
  manager_id VARCHAR(64),
  device_id VARCHAR(128),
  device_model VARCHAR(128),
  device_bound_at TIMESTAMPTZ,
  biometric_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. SAVED LOCATIONS (Clinics, Hospitals, Pharmacies)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.saved_locations (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  geofence_radius_m INT NOT NULL DEFAULT 50,
  category VARCHAR(50) DEFAULT 'CLINIC',
  contact_person VARCHAR(255),
  contact_phone VARCHAR(50),
  created_by VARCHAR(64) REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. DOCTORS DIRECTORY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.doctors (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  specialty VARCHAR(100) NOT NULL,
  qualification VARCHAR(100),
  clinic_name VARCHAR(255),
  phone VARCHAR(20),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  visiting_hours VARCHAR(100),
  priority VARCHAR(20) DEFAULT 'CORE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. TASKS & CALL ASSIGNMENTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_by VARCHAR(64) REFERENCES public.users(id) ON DELETE SET NULL,
  location_name VARCHAR(255),
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geofence_radius_m INT DEFAULT 50,
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
  due_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INT DEFAULT 0,
  order_notes TEXT,
  visit_outcome VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. ATTENDANCE & SHIFT RECORDS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  check_in_latitude DOUBLE PRECISION,
  check_in_longitude DOUBLE PRECISION,
  check_in_address TEXT,
  status VARCHAR(50) DEFAULT 'PRESENT',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. DAILY CALL REPORTS (DCR)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.dcr (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_calls INT DEFAULT 0,
  total_orders_value NUMERIC(12,2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'SUBMITTED',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. EXPENSES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  category VARCHAR(50) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  receipt_url TEXT,
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 9. DEVICE AUTHORIZATIONS & 6-DIGIT OTPs (Owner Approval System)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.device_authorizations (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
  user_name VARCHAR(255) NOT NULL,
  user_phone VARCHAR(20) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  device_id VARCHAR(128) NOT NULL,
  device_model VARCHAR(128) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  approved_at TIMESTAMPTZ,
  approved_by VARCHAR(255)
);

-- ==============================================================================
-- 10. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_device_auth_user ON public.device_authorizations(user_id);
CREATE INDEX IF NOT EXISTS idx_device_auth_status ON public.device_authorizations(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_saved_locations_coords ON public.saved_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON public.doctors(specialty);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance(user_id, date);

-- ==============================================================================
-- 10. PRIMARY SEEDED USERS
-- Password for all seeds: '12345678' (Hash: $2a$10$nxHXckHXdo.upM5CaeF4AerTQYiKRA7Y.M0WjHQ8cKpJX16PnPTYG)
-- ==============================================================================

-- Super Admin: Shivansh Tiwari (Primary Requested Admin)
INSERT INTO public.users (
  id, name, email, phone, password_hash, role, status, biometric_enabled, created_at
) VALUES (
  'usr-admin-shivansh',
  'Shivansh Tiwari',
  'shivanshti10@gmail.com',
  '9009149694',
  '$2a$10$nxHXckHXdo.upM5CaeF4AerTQYiKRA7Y.M0WjHQ8cKpJX16PnPTYG',
  'SUPER_ADMIN',
  'ACTIVE',
  FALSE,
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  status = EXCLUDED.status;

-- Area Manager: Anil Kumar
INSERT INTO public.users (
  id, name, email, phone, password_hash, role, status, biometric_enabled, created_at
) VALUES (
  'usr-mgr-01',
  'Anil Kumar (Area Manager)',
  'manager@ahtri.com',
  '9876543211',
  '$2a$10$nxHXckHXdo.upM5CaeF4AerTQYiKRA7Y.M0WjHQ8cKpJX16PnPTYG',
  'MANAGER',
  'ACTIVE',
  FALSE,
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Field MR: Rahul Sharma
INSERT INTO public.users (
  id, name, email, phone, password_hash, role, status, biometric_enabled, created_at
) VALUES (
  'usr-mr-01',
  'Rahul Sharma (Field MR)',
  'mr@ahtri.com',
  '9876543212',
  '$2a$10$nxHXckHXdo.upM5CaeF4AerTQYiKRA7Y.M0WjHQ8cKpJX16PnPTYG',
  'MR',
  'ACTIVE',
  TRUE,
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Seed Sample Saved Locations
INSERT INTO public.saved_locations (id, name, address, latitude, longitude, geofence_radius_m, category, created_by)
VALUES
  ('loc-01', 'Fortis Escorts Heart Institute', 'Okhla Road, Sukhdev Vihar, New Delhi', 28.5603, 77.2762, 75, 'HOSPITAL', 'usr-admin-shivansh'),
  ('loc-02', 'Max Super Speciality Hospital', '1 2, Press Enclave Marg, Saket, New Delhi', 28.5284, 77.2117, 100, 'HOSPITAL', 'usr-admin-shivansh'),
  ('loc-03', 'AIIMS Medical Clinic', 'Ansari Nagar East, New Delhi', 28.5672, 77.2100, 150, 'CLINIC', 'usr-admin-shivansh')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- Closes all public PostgREST endpoints against unauthorized dumps.
-- Backend queries using SUPABASE_SECRET_KEY (service_role) bypass RLS automatically.
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dcr ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_authorizations ENABLE ROW LEVEL SECURITY;

-- Explicitly allow full access to service_role for all tables
CREATE POLICY "Service role full access on users" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on saved_locations" ON public.saved_locations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on doctors" ON public.doctors FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on tasks" ON public.tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on attendance" ON public.attendance FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on dcr" ON public.dcr FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on expenses" ON public.expenses FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on device_authorizations" ON public.device_authorizations FOR ALL TO service_role USING (true) WITH CHECK (true);

