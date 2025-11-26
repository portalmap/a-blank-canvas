-- Add 'owner' to app_role enum for technical team with full access
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'owner';