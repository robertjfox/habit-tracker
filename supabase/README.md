# Database Migration Scripts

This directory contains SQL migration scripts for setting up the Habit Tracker database tables.

## Quick Setup

### Option 1: Run the standalone setup script (Recommended)

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `setup.sql`
4. Click "Run" to execute the script

This will create all necessary tables with completely unrestricted access.

### Option 2: Use the migration file

If you're using Supabase CLI for migrations:

```bash
# Apply the migration
supabase db push
```

Or manually run the migration file:
1. Open your Supabase SQL Editor
2. Copy and paste the contents of `migrations/20250101000000_create_habits_tables.sql`
3. Click "Run"

## Tables Created

### `habits`
- `id` (UUID, Primary Key) - Auto-generated unique identifier
- `name` (TEXT, NOT NULL) - Habit name
- `is_positive` (BOOLEAN, DEFAULT TRUE) - Whether it's a positive or negative habit
- `category` (TEXT, NULLABLE) - Optional category for grouping habits
- `order` (INTEGER, NULLABLE) - Optional ordering number for sorting
- `created_at` (TIMESTAMP) - Auto-generated creation timestamp

### `habit_completions`
- `id` (UUID, Primary Key) - Auto-generated unique identifier
- `habit_id` (UUID, Foreign Key → habits.id) - Reference to the habit
- `date` (DATE, NOT NULL) - Date of completion (format: YYYY-MM-DD)
- `completed` (BOOLEAN, DEFAULT FALSE) - Whether the habit was completed
- `created_at` (TIMESTAMP) - Auto-generated creation timestamp
- **Unique constraint**: `(habit_id, date)` - One completion record per habit per day

## Security

**Important**: These tables are created with **completely unrestricted access**:
- Row Level Security (RLS) is **disabled**
- All permissions are granted to `anon` and `authenticated` roles
- Anyone with your Supabase API key can read/write data

If you need to add security later, you can enable RLS and create policies.

## Indexes

The following indexes are created for better query performance:
- `idx_habit_completions_habit_id` - On `habit_completions.habit_id`
- `idx_habit_completions_date` - On `habit_completions.date`
- `idx_habits_created_at` - On `habits.created_at`

