-- Initialize database for Poll Vault
-- This script sets up the sessions table required for express-session with connect-pg-simple

-- Create sessions table for express-session storage
CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" VARCHAR NOT NULL COLLATE "default",
  "sess" JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
) WITH (OIDS=FALSE);

-- Add primary key and index for performance
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX IF NOT EXISTS "IDX_sessions_expire" ON "sessions" ("expire");

-- Set proper permissions
GRANT ALL PRIVILEGES ON TABLE "sessions" TO pollvault_user;