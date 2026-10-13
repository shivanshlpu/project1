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
