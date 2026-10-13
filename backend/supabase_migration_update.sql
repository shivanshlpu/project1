-- ==============================================================================
-- AHTRI FFA - SUPABASE SCHEMA UPDATE (RUN IN SUPABASE SQL EDITOR)
-- Project Dashboard > SQL Editor > New query > Paste & Run
-- ==============================================================================

-- 1. COMPETITIONS & INCENTIVE REWARDS TABLE
CREATE TABLE IF NOT EXISTS public.competitions (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target_hq_id VARCHAR(64),
  target_hq_name VARCHAR(255),
  target_product_id VARCHAR(64),
  target_product_name VARCHAR(255),
  target_units INT NOT NULL DEFAULT 0,
  reward_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  start_date VARCHAR(50) NOT NULL,
  end_date VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reward_claims (
  id VARCHAR(64) PRIMARY KEY,
  competition_id VARCHAR(64) REFERENCES public.competitions(id) ON DELETE CASCADE,
  mr_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
  mr_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'PENDING',
  units_sold INT DEFAULT 0,
  reward_amount NUMERIC(10, 2) DEFAULT 0,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  decided_by VARCHAR(64)
);

-- 2. MEDICINE PACKAGING VARIANTS TABLE
CREATE TABLE IF NOT EXISTS public.medicine_packaging_variants (
  id VARCHAR(64) PRIMARY KEY,
  medicine_id VARCHAR(64) NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  size NUMERIC(10, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  pts_rate NUMERIC(10, 2) NOT NULL,
  mrp NUMERIC(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MONTHLY STOCKAGE PERMISSIONS & REQUESTS TABLES
CREATE TABLE IF NOT EXISTS public.monthly_stockage_permissions (
  id VARCHAR(64) PRIMARY KEY,
  mr_id VARCHAR(64) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mr_name VARCHAR(255) NOT NULL,
  month_year VARCHAR(7) NOT NULL,
  stocker_id VARCHAR(64),
  hq_id VARCHAR(64),
  status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (
    status IN ('AVAILABLE', 'RESERVED', 'CONSUMED', 'REVOKED', 'EXPIRED')
  ),
  granted_by_admin_id VARCHAR(64) NOT NULL,
  granted_by_admin_name VARCHAR(255) NOT NULL,
  notes TEXT,
  revoked_at TIMESTAMPTZ,
  revoked_by_admin_id VARCHAR(64),
  consumed_at TIMESTAMPTZ,
  reserved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stockage_submission_requests (
  id VARCHAR(64) PRIMARY KEY,
  permission_id VARCHAR(64) NOT NULL REFERENCES public.monthly_stockage_permissions(id),
  mr_id VARCHAR(64) NOT NULL REFERENCES public.users(id),
  mr_name VARCHAR(255) NOT NULL,
  month_year VARCHAR(7) NOT NULL,
  stocker_id VARCHAR(64) NOT NULL,
  hq_id VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED' CHECK (
    status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'APPLIED')
  ),
  total_items INT NOT NULL DEFAULT 0,
  total_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by_admin_id VARCHAR(64),
  reviewed_by_admin_name VARCHAR(255),
  admin_notes TEXT,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stockage_submission_items (
  id VARCHAR(64) PRIMARY KEY,
  request_id VARCHAR(64) NOT NULL REFERENCES public.stockage_submission_requests(id) ON DELETE CASCADE,
  medicine_id VARCHAR(64) NOT NULL REFERENCES public.medicines(id),
  medicine_name VARCHAR(255) NOT NULL,
  packaging_id VARCHAR(64),
  packaging_size VARCHAR(100),
  packaging_unit VARCHAR(50),
  submitted_quantity NUMERIC(10, 2) NOT NULL,
  approved_quantity NUMERIC(10, 2),
  previous_stock NUMERIC(10, 2),
  final_stock NUMERIC(10, 2),
  pts_rate NUMERIC(10, 2),
  mrp NUMERIC(10, 2),
  notes TEXT
);

-- 4. ROW LEVEL SECURITY & SERVICE ROLE PERMISSIONS
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_packaging_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_stockage_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stockage_submission_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stockage_submission_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on competitions" ON public.competitions;
CREATE POLICY "Service role full access on competitions" ON public.competitions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on reward_claims" ON public.reward_claims;
CREATE POLICY "Service role full access on reward_claims" ON public.reward_claims FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on medicine_packaging_variants" ON public.medicine_packaging_variants;
CREATE POLICY "Service role full access on medicine_packaging_variants" ON public.medicine_packaging_variants FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on monthly_stockage_permissions" ON public.monthly_stockage_permissions;
CREATE POLICY "Service role full access on monthly_stockage_permissions" ON public.monthly_stockage_permissions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on stockage_submission_requests" ON public.stockage_submission_requests;
CREATE POLICY "Service role full access on stockage_submission_requests" ON public.stockage_submission_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on stockage_submission_items" ON public.stockage_submission_items;
CREATE POLICY "Service role full access on stockage_submission_items" ON public.stockage_submission_items FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. ROUTE BATCHES MASTER TABLE & SEED (19 AUTHENTIC FIELD BATCHES)
CREATE TABLE IF NOT EXISTS public.route_batches (
  id VARCHAR(64) PRIMARY KEY,
  batch_code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  hq_id VARCHAR(64),
  hq_code VARCHAR(50),
  hq_name VARCHAR(255),
  mr_id VARCHAR(64),
  mr_name VARCHAR(255),
  territory_name VARCHAR(255),
  route_stops JSONB NOT NULL DEFAULT '[]'::jsonb,
  areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  distance_km NUMERIC(10, 2) NOT NULL DEFAULT 0,
  standard_reimbursement_rate NUMERIC(10, 2) NOT NULL DEFAULT 2.50,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.route_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on route_batches" ON public.route_batches;
CREATE POLICY "Service role full access on route_batches" ON public.route_batches FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read on route_batches" ON public.route_batches;
CREATE POLICY "Public read on route_batches" ON public.route_batches FOR SELECT TO anon, authenticated USING (true);

-- SEED THE 19 AUTHENTIC ROUTE BATCHES (Kotma 9, Shahdol 5, Ambikapur 5)
INSERT INTO public.route_batches (id, batch_code, name, hq_id, hq_code, hq_name, mr_id, mr_name, territory_name, route_stops, areas, distance_km, standard_reimbursement_rate, status)
VALUES
-- Kotma (Amar Dwivedi: KOT-B01 to KOT-B09)
('rb-kot-b01', 'KOT-B01', 'Kotma - Marwahi - Dhanikundi', 'HQ-KOT-001', 'KOT', 'Kotma', 'usr-mr-01', 'Amar Dwivedi', 'Kotma HQ Territory', '["Kotma", "Marwahi", "Dhanikundi"]'::jsonb, '["Kotma", "Marwahi", "Dhanikundi"]'::jsonb, 85, 2.50, 'ACTIVE'),
('rb-kot-b02', 'KOT-B02', 'Kotma - Kelhari - Janakpur', 'HQ-KOT-001', 'KOT', 'Kotma', 'usr-mr-01', 'Amar Dwivedi', 'Kotma HQ Territory', '["Kotma", "Kelhari", "Janakpur"]'::jsonb, '["Kotma", "Kelhari", "Janakpur"]'::jsonb, 95, 2.50, 'ACTIVE'),
('rb-kot-b03', 'KOT-B03', 'Kotma - Keswahi - Girva - Khamhidol', 'HQ-KOT-001', 'KOT', 'Kotma', 'usr-mr-01', 'Amar Dwivedi', 'Kotma HQ Territory', '["Kotma", "Keswahi", "Girva", "Khamhidol"]'::jsonb, '["Kotma", "Keswahi", "Girva", "Khamhidol"]'::jsonb, 110, 2.50, 'ACTIVE'),
('rb-kot-b04', 'KOT-B04', 'Kotma - Jaithari - Rajendragram', 'HQ-KOT-001', 'KOT', 'Kotma', 'usr-mr-01', 'Amar Dwivedi', 'Kotma HQ Territory', '["Kotma", "Jaithari", "Rajendragram"]'::jsonb, '["Kotma", "Jaithari", "Rajendragram"]'::jsonb, 70, 2.50, 'ACTIVE'),
('rb-kot-b05', 'KOT-B05', 'Kotma - Anuppur', 'HQ-KOT-001', 'KOT', 'Kotma', 'usr-mr-01', 'Amar Dwivedi', 'Kotma HQ Territory', '["Kotma", "Anuppur"]'::jsonb, '["Kotma", "Anuppur"]'::jsonb, 45, 2.50, 'ACTIVE'),
('rb-kot-b06', 'KOT-B06', 'Kotma - Manendragarh', 'HQ-KOT-001', 'KOT', 'Kotma', 'usr-mr-01', 'Amar Dwivedi', 'Kotma HQ Territory', '["Kotma", "Manendragarh"]'::jsonb, '["Kotma", "Manendragarh"]'::jsonb, 65, 2.50, 'ACTIVE'),
('rb-kot-b07', 'KOT-B07', 'Kotma - Chirmiri', 'HQ-KOT-001', 'KOT', 'Kotma', 'usr-mr-01', 'Amar Dwivedi', 'Kotma HQ Territory', '["Kotma", "Chirmiri"]'::jsonb, '["Kotma", "Chirmiri"]'::jsonb, 80, 2.50, 'ACTIVE'),
('rb-kot-b08', 'KOT-B08', 'Kotma - Baikunthpur', 'HQ-KOT-001', 'KOT', 'Kotma', 'usr-mr-01', 'Amar Dwivedi', 'Kotma HQ Territory', '["Kotma", "Baikunthpur"]'::jsonb, '["Kotma", "Baikunthpur"]'::jsonb, 90, 2.50, 'ACTIVE'),
('rb-kot-b09', 'KOT-B09', 'Kotma - Gaurela', 'HQ-KOT-001', 'KOT', 'Kotma', 'usr-mr-01', 'Amar Dwivedi', 'Kotma HQ Territory', '["Kotma", "Gaurela"]'::jsonb, '["Kotma", "Gaurela"]'::jsonb, 95, 2.50, 'ACTIVE'),

-- Shahdol (Aman Rathore: SHD-B01 to SHD-B05)
('rb-shd-b01', 'SHD-B01', 'Shahdol - Budhar - Dhanpuri - OPM', 'HQ-SHD-001', 'SHD', 'Shahdol', 'usr-mr-02', 'Aman Rathore', 'Shahdol HQ Territory', '["Shahdol", "Budhar", "Dhanpuri", "OPM"]'::jsonb, '["Shahdol", "Budhar", "Dhanpuri", "OPM"]'::jsonb, 55, 2.50, 'ACTIVE'),
('rb-shd-b02', 'SHD-B02', 'Shahdol - Pali - Navrozabad', 'HQ-SHD-001', 'SHD', 'Shahdol', 'usr-mr-02', 'Aman Rathore', 'Shahdol HQ Territory', '["Shahdol", "Pali", "Navrozabad"]'::jsonb, '["Shahdol", "Pali", "Navrozabad"]'::jsonb, 75, 2.50, 'ACTIVE'),
('rb-shd-b03', 'SHD-B03', 'Shahdol - Gohparu - Jaisinghnagar', 'HQ-SHD-001', 'SHD', 'Shahdol', 'usr-mr-02', 'Aman Rathore', 'Shahdol HQ Territory', '["Shahdol", "Gohparu", "Jaisinghnagar"]'::jsonb, '["Shahdol", "Gohparu", "Jaisinghnagar"]'::jsonb, 120, 2.50, 'ACTIVE'),
('rb-shd-b04', 'SHD-B04', 'Shahdol - Jaitpur', 'HQ-SHD-001', 'SHD', 'Shahdol', 'usr-mr-02', 'Aman Rathore', 'Shahdol HQ Territory', '["Shahdol", "Jaitpur"]'::jsonb, '["Shahdol", "Jaitpur"]'::jsonb, 80, 2.50, 'ACTIVE'),
('rb-shd-b05', 'SHD-B05', 'Shahdol - Manpur', 'HQ-SHD-001', 'SHD', 'Shahdol', 'usr-mr-02', 'Aman Rathore', 'Shahdol HQ Territory', '["Shahdol", "Manpur"]'::jsonb, '["Shahdol", "Manpur"]'::jsonb, 110, 2.50, 'ACTIVE'),

-- Ambikapur (Ashish Soni: AMB-B01 to AMB-B05)
('rb-amb-b01', 'AMB-B01', 'Ambikapur - Laknapur - Udaypur - Kedma', 'HQ-AMB-001', 'AMB', 'Ambikapur', 'usr-mr-03', 'Ashish Soni', 'Ambikapur HQ Territory', '["Ambikapur", "Laknapur", "Udaypur", "Kedma"]'::jsonb, '["Ambikapur", "Laknapur", "Udaypur", "Kedma"]'::jsonb, 90, 2.50, 'ACTIVE'),
('rb-amb-b02', 'AMB-B02', 'Ambikapur - Batuli - Sitapur - Patthalgawn', 'HQ-AMB-001', 'AMB', 'Ambikapur', 'usr-mr-03', 'Ashish Soni', 'Ambikapur HQ Territory', '["Ambikapur", "Batuli", "Sitapur", "Patthalgawn"]'::jsonb, '["Ambikapur", "Batuli", "Sitapur", "Patthalgawn"]'::jsonb, 130, 2.50, 'ACTIVE'),
('rb-amb-b03', 'AMB-B03', 'Ambikapur - Silpili - Vishrampur - Surajpur - Devnagar - Shreenagar', 'HQ-AMB-001', 'AMB', 'Ambikapur', 'usr-mr-03', 'Ashish Soni', 'Ambikapur HQ Territory', '["Ambikapur", "Silpili", "Vishrampur", "Surajpur", "Devnagar", "Shreenagar"]'::jsonb, '["Ambikapur", "Silpili", "Vishrampur", "Surajpur", "Devnagar", "Shreenagar"]'::jsonb, 115, 2.50, 'ACTIVE'),
('rb-amb-b04', 'AMB-B04', 'Ambikapur - Pratapur - Siluta - Vadrafnagar', 'HQ-AMB-001', 'AMB', 'Ambikapur', 'usr-mr-03', 'Ashish Soni', 'Ambikapur HQ Territory', '["Ambikapur", "Pratapur", "Siluta", "Vadrafnagar"]'::jsonb, '["Ambikapur", "Pratapur", "Siluta", "Vadrafnagar"]'::jsonb, 140, 2.50, 'ACTIVE'),
('rb-amb-b05', 'AMB-B05', 'Ambikapur - Latori - Krwan - Datima - Batra - Bhatgawn', 'HQ-AMB-001', 'AMB', 'Ambikapur', 'usr-mr-03', 'Ashish Soni', 'Ambikapur HQ Territory', '["Ambikapur", "Latori", "Krwan", "Datima", "Batra", "Bhatgawn"]'::jsonb, '["Ambikapur", "Latori", "Krwan", "Datima", "Batra", "Bhatgawn"]'::jsonb, 125, 2.50, 'ACTIVE')
ON CONFLICT (batch_code) DO UPDATE SET
  name = EXCLUDED.name,
  hq_id = EXCLUDED.hq_id,
  hq_code = EXCLUDED.hq_code,
  hq_name = EXCLUDED.hq_name,
  mr_id = EXCLUDED.mr_id,
  mr_name = EXCLUDED.mr_name,
  territory_name = EXCLUDED.territory_name,
  route_stops = EXCLUDED.route_stops,
  areas = EXCLUDED.areas,
  distance_km = EXCLUDED.distance_km,
  standard_reimbursement_rate = EXCLUDED.standard_reimbursement_rate,
  status = EXCLUDED.status,
  updated_at = NOW();
