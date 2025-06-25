# Habit Tracker PWA

A minimalist habit tracking calendar built with Next.js and Supabase.

## Features

✅ **View All Habits** - See all habits at once in compact 4-week calendars  
✅ **Individual Tracking** - Focus on single habits with infinite scroll  
✅ **PWA Support** - Install as native mobile app  
✅ **Royal Blue Design** - Clean, minimalist interface  
✅ **Mobile Optimized** - Perfect touch targets and spacing  
✅ **Real-time Sync** - Data persisted with Supabase

## Database Setup

Run this SQL in your Supabase SQL editor:

```sql
-- Create habits table
CREATE TABLE IF NOT EXISTS habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create habit_completions table
CREATE TABLE IF NOT EXISTS habit_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(habit_id, date)
);

-- Enable Row Level Security
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;

-- Create policies (allows all operations for now)
CREATE POLICY "Allow all operations on habits" ON habits FOR ALL USING (true);
CREATE POLICY "Allow all operations on habit_completions" ON habit_completions FOR ALL USING (true);
```

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## PWA Installation

See `PWA-SETUP.md` for instructions on completing the PWA icon setup and installing on mobile devices.
