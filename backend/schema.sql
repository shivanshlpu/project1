-- AHTRI Field Force Automation (FFA) PostgreSQL Schema DDL
-- Matching Section 2 of AHTRI_FFA_Implementation_Plan.md

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Identity & RBAC
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL
);

CREATE TABLE regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id UUID REFERENCES regions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
    area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    last_login_at TIMESTAMP WITH TIME ZONE,
    device_id VARCHAR(255),
    biometric_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE territories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    area_id UUID REFERENCES areas(id) ON DELETE CASCADE,
    mr_user_id UUID REFERENCES users(id) ON DELETE CASCADE
);

-- Tasks
CREATE TYPE task_status AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'CANCELLED');
CREATE TYPE verification_type AS ENUM ('START', 'COMPLETE');

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    assigned_mr_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geofence_radius_m INTEGER DEFAULT 20,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    status task_status DEFAULT 'ASSIGNED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE task_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    mr_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE location_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    type verification_type NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    distance_m DOUBLE PRECISION NOT NULL,
    gps_accuracy_m DOUBLE PRECISION NOT NULL,
    verified BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Doctors
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    qualification VARCHAR(100),
    specialization VARCHAR(100),
    class VARCHAR(5) CHECK (class IN ('A', 'B', 'C')),
    potential_score INTEGER DEFAULT 0,
    phone VARCHAR(20),
    whatsapp VARCHAR(20),
    clinic VARCHAR(200),
    hospital VARCHAR(200),
    address TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE doctor_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    mr_id UUID REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    start_lat DOUBLE PRECISION NOT NULL,
    start_lng DOUBLE PRECISION NOT NULL,
    end_lat DOUBLE PRECISION,
    end_lng DOUBLE PRECISION,
    duration_seconds INTEGER,
    gps_accuracy_m DOUBLE PRECISION,
    signature_file_key VARCHAR(255),
    remarks TEXT,
    follow_up_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE visit_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES doctor_visits(id) ON DELETE CASCADE,
    product_id VARCHAR(100),
    product_name VARCHAR(200),
    samples_given INTEGER DEFAULT 0,
    notes TEXT
);

-- Attendance
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in_at TIMESTAMP WITH TIME ZONE NOT NULL,
    check_in_lat DOUBLE PRECISION NOT NULL,
    check_in_lng DOUBLE PRECISION NOT NULL,
    check_out_at TIMESTAMP WITH TIME ZONE,
    check_out_lat DOUBLE PRECISION,
    check_out_lng DOUBLE PRECISION,
    status VARCHAR(20) DEFAULT 'PRESENT',
    CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- DCR
CREATE TABLE dcr (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mr_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'DRAFT',
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    manager_comment TEXT,
    CONSTRAINT unique_mr_dcr_date UNIQUE (mr_id, date)
);

CREATE TABLE dcr_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dcr_id UUID REFERENCES dcr(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES doctor_visits(id) ON DELETE SET NULL,
    doctor_name VARCHAR(150),
    products_discussed TEXT[],
    samples INTEGER DEFAULT 0,
    order_taken BOOLEAN DEFAULT false,
    remarks TEXT
);

-- Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mr_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(30) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    receipt_file_key VARCHAR(255),
    ocr_extracted_amount NUMERIC(10, 2),
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leave & Tour Plans
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mr_id UUID REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tour_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mr_id UUID REFERENCES users(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL,
    plan_json JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING'
);

-- Generic Approvals Engine (§4.3)
CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(30) NOT NULL, -- LEAVE, EXPENSE, DCR_CORRECTION, TOUR_PLAN
    entity_id UUID NOT NULL,
    requested_by UUID REFERENCES users(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    decided_at TIMESTAMP WITH TIME ZONE
);

-- Notifications & Announcements
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    data_json JSONB,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    scope VARCHAR(20) DEFAULT 'ALL',
    scope_id UUID,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs (Immutable)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_value_json JSONB,
    new_value_json JSONB,
    ip_address VARCHAR(45),
    device_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Day-one indexes (Section 2)
CREATE INDEX idx_tasks_mr_date_status ON tasks(assigned_mr_id, date, status);
CREATE INDEX idx_doctor_visits_mr_start ON doctor_visits(mr_id, start_time);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
