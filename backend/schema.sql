-- ==============================================================================
-- AHTRI Field Force Automation (FFA) - Complete Supabase PostgreSQL Schema
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. USERS & ACCESS CONTROL
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'MR' CHECK (
    role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MR')
  ),
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
-- 2. SAVED LOCATIONS (Clinics, Hospitals, Pharmacies)
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
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. DOCTORS DIRECTORY
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
  assigned_mr_id VARCHAR(64),
  assigned_mr_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. TASKS & FIELD CALLS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_mr_id VARCHAR(64),
  assigned_mr_name VARCHAR(255),
  created_by VARCHAR(64),
  date VARCHAR(50) NOT NULL,
  time VARCHAR(50),
  location_name VARCHAR(255),
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  geofence_radius_m INT DEFAULT 50,
  status VARCHAR(50) DEFAULT 'ASSIGNED' CHECK (
    status IN ('ASSIGNED', 'IN_PROGRESS', 'ORDER_PENDING', 'COMPLETED', 'SUSPENDED', 'CANCELLED')
  ),
  priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INT DEFAULT 0,
  outcome TEXT,
  orders JSONB,
  visit_photo TEXT,
  visit_photo_captured_at TIMESTAMPTZ,
  verification_photo_key TEXT,
  verification_photo_source VARCHAR(50),
  device_integrity_status VARCHAR(50) DEFAULT 'VERIFIED',
  suspended_at TIMESTAMPTZ,
  suspended_reason TEXT,
  unsuspended_at TIMESTAMPTZ,
  unsuspended_by VARCHAR(64),
  hq_id VARCHAR(64),
  hq_name VARCHAR(255),
  stocker_id VARCHAR(64),
  stocker_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. ATTENDANCE & SHIFT RECORDS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
  user_name VARCHAR(255),
  date VARCHAR(50) NOT NULL,
  check_in_at TIMESTAMPTZ,
  check_in_lat DOUBLE PRECISION,
  check_in_lng DOUBLE PRECISION,
  check_in_location_name VARCHAR(255),
  check_in_photo TEXT,
  photo_captured_at TIMESTAMPTZ,
  photo_purged BOOLEAN DEFAULT FALSE,
  check_out_at TIMESTAMPTZ,
  check_out_lat DOUBLE PRECISION,
  check_out_lng DOUBLE PRECISION,
  check_out_location_name VARCHAR(255),
  distance_meters DOUBLE PRECISION,
  is_verified_location BOOLEAN DEFAULT TRUE,
  status VARCHAR(50) DEFAULT 'PRESENT',
  punch_in_photo_key TEXT,
  punch_in_photo_source VARCHAR(50) DEFAULT 'CAMERA',
  punch_out_photo_key TEXT,
  punch_out_photo_source VARCHAR(50) DEFAULT 'CAMERA',
  late_minutes INT DEFAULT 0,
  early_minutes INT DEFAULT 0,
  working_hours DOUBLE PRECISION DEFAULT 0,
  device_integrity_status VARCHAR(50) DEFAULT 'VERIFIED',
  is_mocked BOOLEAN DEFAULT FALSE,
  hq_id VARCHAR(64),
  hq_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. ATTENDANCE SETTINGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_settings (
  id VARCHAR(64) PRIMARY KEY,
  expected_punch_in_time VARCHAR(20) DEFAULT '10:00:00',
  allowed_punch_in_window_minutes INT DEFAULT 30,
  expected_punch_out_time VARCHAR(20) DEFAULT '18:00:00',
  allowed_punch_out_window_minutes INT DEFAULT 30,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. DOCTOR VISITS & DETAILING DETAILS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.doctor_visits (
  id VARCHAR(64) PRIMARY KEY,
  doctor_id VARCHAR(64) REFERENCES public.doctors(id) ON DELETE CASCADE,
  mr_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  start_lat DOUBLE PRECISION,
  start_lng DOUBLE PRECISION,
  end_lat DOUBLE PRECISION,
  end_lng DOUBLE PRECISION,
  duration_seconds INT DEFAULT 0,
  gps_accuracy_m DOUBLE PRECISION DEFAULT 10,
  signature_file_key TEXT,
  remarks TEXT,
  follow_up_date VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.visit_details (
  id VARCHAR(64) PRIMARY KEY,
  visit_id VARCHAR(64) REFERENCES public.doctor_visits(id) ON DELETE CASCADE,
  product_id VARCHAR(64),
  product_name VARCHAR(255),
  samples_given INT DEFAULT 0,
  notes TEXT
);

-- ==============================================================================
-- 8. HEADQUARTERS, STOCKERS & MEDICINES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.headquarters (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  state VARCHAR(100) DEFAULT 'Madhya Pradesh',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stockers (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  hq_id VARCHAR(64) REFERENCES public.headquarters(id) ON DELETE CASCADE,
  address TEXT,
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.medicines (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(64) UNIQUE,
  composition TEXT,
  category VARCHAR(100),
  pack_size VARCHAR(50),
  unit_price NUMERIC(10, 2) NOT NULL,
  mrp NUMERIC(10, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 9. EXPENSES, LEAVES & TOUR PLANS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  category VARCHAR(50) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT,
  receipt_url TEXT,
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
  leave_type VARCHAR(50) NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  total_days INT NOT NULL,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  approved_by VARCHAR(64),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.monthly_tour_plans (
  id VARCHAR(64) PRIMARY KEY,
  mr_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
  mr_name VARCHAR(255),
  month VARCHAR(20) NOT NULL,
  status VARCHAR(50) DEFAULT 'SUBMITTED',
  entries JSONB,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 10. DEVICE AUTHORIZATIONS
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
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')
  ),
  expires_at TIMESTAMPTZ NOT NULL,
  approved_at TIMESTAMPTZ,
  approved_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 11. INDEXES FOR HIGH-SPEED QUERYING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_tasks_mr ON public.tasks(assigned_mr_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON public.tasks(date);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON public.doctors(specialty);

-- ==============================================================================
-- 12. INITIAL PRIMARY SEED DATA
-- Default Passwords: 'Password@123' and '87654321' for Shivansh Tiwari
-- ==============================================================================
INSERT INTO public.users (id, name, email, phone, password_hash, role, status, biometric_enabled, created_at)
VALUES 
  ('usr-admin-shivansh', 'Shivansh Tiwari', 'shivanshti10@gmail.com', '9009149694', '$2a$10$tZ922R4kS2xK65.o8b/jPec6kU1.Vq2t6Q1lP8uO3fPZtC2WdYq8i', 'SUPER_ADMIN', 'ACTIVE', FALSE, NOW()),
  ('usr-mgr-01', 'Anil Kumar (Area Manager)', 'manager@ahtri.com', '9876543211', '$2a$10$nxHXckHXdo.upM5CaeF4AerTQYiKRA7Y.M0WjHQ8cKpJX16PnPTYG', 'MANAGER', 'ACTIVE', FALSE, NOW()),
  ('usr-mr-01', 'Rahul Sharma (Field MR)', 'mr@ahtri.com', '9876543212', '$2a$10$nxHXckHXdo.upM5CaeF4AerTQYiKRA7Y.M0WjHQ8cKpJX16PnPTYG', 'MR', 'ACTIVE', TRUE, NOW())
ON CONFLICT (email) DO UPDATE 
SET name = EXCLUDED.name, role = EXCLUDED.role, status = EXCLUDED.status;

-- Default Attendance Settings
INSERT INTO public.attendance_settings (id, expected_punch_in_time, allowed_punch_in_window_minutes, expected_punch_out_time, allowed_punch_out_window_minutes)
VALUES ('att-settings-default', '10:00:00', 30, '18:00:00', 30)
ON CONFLICT (id) DO NOTHING;

-- Headquarters
INSERT INTO public.headquarters (id, name, state)
VALUES 
  ('hq-shahdol', 'Shahdol', 'Madhya Pradesh'),
  ('hq-anuppur', 'Anuppur', 'Madhya Pradesh'),
  ('hq-umaria', 'Umaria', 'Madhya Pradesh')
ON CONFLICT (id) DO NOTHING;

-- Stockers
INSERT INTO public.stockers (id, name, hq_id, address, phone)
VALUES 
  ('stk-shd-01', 'Central Pharma Stockist - Shahdol', 'hq-shahdol', 'Station Road, Shahdol', '9893012345'),
  ('stk-anp-01', 'Vindhya Medico Stockists - Anuppur', 'hq-anuppur', 'Main Market, Anuppur', '9893054321')
ON CONFLICT (id) DO NOTHING;

-- Medicines
INSERT INTO public.medicines (id, name, sku, composition, category, pack_size, unit_price, mrp)
VALUES 
  ('med-01', 'CardioFix-50', 'CF-50-TEL', 'Telmisartan 40mg', 'Cardiovascular', '10x10 Tablets', 180.00, 220.00),
  ('med-02', 'DermaSoothe Cream', 'DS-CRM-30', 'Clobetasol + Neomycin', 'Dermatology', '30g Tube', 210.00, 260.00),
  ('med-03', 'Glucotrol-M', 'GLU-M-500', 'Metformin 500mg', 'Diabetic', '10x15 Tablets', 145.00, 185.00),
  ('med-04', 'PanSafe-DSR', 'PAN-DSR-40', 'Pantoprazole 40mg + Domperidone 30mg', 'Gastro', '10x10 Capsules', 160.00, 210.00)
ON CONFLICT (id) DO NOTHING;

-- Sample Doctors
INSERT INTO public.doctors (id, name, specialty, qualification, clinic_name, phone, latitude, longitude, address, visiting_hours, priority, assigned_mr_id, assigned_mr_name)
VALUES
  ('doc-01', 'Dr. Rajesh Sharma', 'Cardiologist', 'MD, DM (Cardio)', 'Sharma Heart Care Centre', '9826011111', 28.5245, 77.2066, 'Opposite District Hospital, Shahdol', '10:00 AM - 02:00 PM', 'CORE', 'usr-mr-01', 'Rahul Sharma (Field MR)'),
  ('doc-02', 'Dr. Priya Verma', 'Pediatrician', 'MD (Pediatrics)', 'Verma Children Hospital', '9826022222', 28.5355, 77.2100, 'Civil Lines, Shahdol', '11:00 AM - 03:00 PM', 'CORE', 'usr-mr-01', 'Rahul Sharma (Field MR)'),
  ('doc-03', 'Dr. Sandeep Gupta', 'General Physician', 'MBBS, MD (Medicine)', 'Gupta Medical Clinic', '9826033333', 28.5400, 77.2150, 'Main Market, Burhar', '04:00 PM - 08:00 PM', 'SUPER_CORE', 'usr-mr-01', 'Rahul Sharma (Field MR)')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 13. ROW LEVEL SECURITY (RLS) POLICIES
-- Service Role (backend SUPABASE_SECRET_KEY) has unrestricted access.
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.headquarters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_tour_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_authorizations ENABLE ROW LEVEL SECURITY;

-- Allow full access to service_role (used by backend)
DROP POLICY IF EXISTS "Service role full access on users" ON public.users;
CREATE POLICY "Service role full access on users" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on saved_locations" ON public.saved_locations;
CREATE POLICY "Service role full access on saved_locations" ON public.saved_locations FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on doctors" ON public.doctors;
CREATE POLICY "Service role full access on doctors" ON public.doctors FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on tasks" ON public.tasks;
CREATE POLICY "Service role full access on tasks" ON public.tasks FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on attendance" ON public.attendance;
CREATE POLICY "Service role full access on attendance" ON public.attendance FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on attendance_settings" ON public.attendance_settings;
CREATE POLICY "Service role full access on attendance_settings" ON public.attendance_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on doctor_visits" ON public.doctor_visits;
CREATE POLICY "Service role full access on doctor_visits" ON public.doctor_visits FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on visit_details" ON public.visit_details;
CREATE POLICY "Service role full access on visit_details" ON public.visit_details FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on headquarters" ON public.headquarters;
CREATE POLICY "Service role full access on headquarters" ON public.headquarters FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on stockers" ON public.stockers;
CREATE POLICY "Service role full access on stockers" ON public.stockers FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on medicines" ON public.medicines;
CREATE POLICY "Service role full access on medicines" ON public.medicines FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on expenses" ON public.expenses;
CREATE POLICY "Service role full access on expenses" ON public.expenses FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on leave_requests" ON public.leave_requests;
CREATE POLICY "Service role full access on leave_requests" ON public.leave_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on monthly_tour_plans" ON public.monthly_tour_plans;
CREATE POLICY "Service role full access on monthly_tour_plans" ON public.monthly_tour_plans FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on device_authorizations" ON public.device_authorizations;
CREATE POLICY "Service role full access on device_authorizations" ON public.device_authorizations FOR ALL TO service_role USING (true) WITH CHECK (true);
