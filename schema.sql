-- ==========================================
-- KLT AMC Service Schema
-- Run this script in the Supabase SQL Editor
-- Note: Ensure you disable Row Level Security (RLS) on these tables if you are just prototyping without auth integration, 
-- OR set up appropriate RLS policies to allow the client to insert/read data.

-- Drop existing old tables first to allow clean recreation
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS machines CASCADE;
DROP TABLE IF EXISTS "amcContracts" CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS "workReports" CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- 1. Users Table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  mobile TEXT,
  password TEXT,
  role TEXT,
  skill TEXT,
  area TEXT,
  status TEXT,
  "createdAt" TEXT
);

-- 2. Customers Table
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT,
  contact TEXT,
  email TEXT,
  city TEXT,
  address TEXT,
  "createdAt" TEXT
);

-- 3. Machines Table
CREATE TABLE machines (
  id TEXT PRIMARY KEY,
  "customerId" TEXT,
  "machineType" TEXT,
  "serialNumber" TEXT,
  "installDate" TEXT,
  status TEXT,
  "createdAt" TEXT
);

-- 4. AMC Contracts Table
CREATE TABLE "amcContracts" (
  id TEXT PRIMARY KEY,
  "customerId" TEXT,
  "machineId" TEXT,
  "startDate" TEXT,
  "endDate" TEXT,
  "totalAmount" NUMERIC,
  "paymentTerms" TEXT,
  status TEXT,
  payments JSONB DEFAULT '[]'::jsonb,
  "createdAt" TEXT
);

-- 5. Tickets Table
CREATE TABLE tickets (
  id TEXT PRIMARY KEY,
  "customerId" TEXT,
  "machineId" TEXT,
  title TEXT,
  description TEXT,
  priority TEXT,
  status TEXT,
  "assignedTo" TEXT,
  notes JSONB DEFAULT '[]'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  rating NUMERIC,
  feedback TEXT,
  "ticketType" TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

-- 6. Work Reports Table
CREATE TABLE "workReports" (
  id TEXT PRIMARY KEY,
  "ticketId" TEXT,
  "engineerId" TEXT,
  "workDone" TEXT,
  "partsReplaced" TEXT,
  "timeSpent" NUMERIC,
  notes TEXT,
  "submittedAt" TEXT
);

-- 7. Notifications Table (Optional fallback)
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  "userId" TEXT,
  message TEXT,
  "isRead" BOOLEAN DEFAULT FALSE,
  "createdAt" TEXT
);

-- Note: Ensure you disable Row Level Security (RLS) on these tables if you are just prototyping without auth integration, 
-- OR set up appropriate RLS policies to allow the client to insert/read data.

-- 8. Seed Default Admin User
INSERT INTO users (id, name, email, mobile, password, role, status, "createdAt")
VALUES ('usr-admin', 'KLT Admin', 'admin@klt.com', '9876543210', 'admin123', 'admin', 'active', CURRENT_TIMESTAMP::text);
