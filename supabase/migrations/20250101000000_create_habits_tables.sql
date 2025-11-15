-- Migration: Create habits and habit_completions tables
-- This migration creates the necessary tables for the habit tracker app
-- Tables are created with completely unrestricted access (no RLS)

-- Create habits table
CREATE TABLE IF NOT EXISTS habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_positive BOOLEAN DEFAULT TRUE NOT NULL,
  category TEXT,
  "order" INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create habit_completions table
CREATE TABLE IF NOT EXISTS habit_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(habit_id, date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_id ON habit_completions(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON habit_completions(date);
CREATE INDEX IF NOT EXISTS idx_habits_created_at ON habits(created_at);

-- Disable Row Level Security to make tables completely unrestricted
ALTER TABLE habits DISABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions DISABLE ROW LEVEL SECURITY;

-- Grant all necessary permissions (if needed)
GRANT ALL ON habits TO anon, authenticated;
GRANT ALL ON habit_completions TO anon, authenticated;

