import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bnkmnsijirvhtotlhylz.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJua21uc2lqaXJ2aHRvdGxoeWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NjEwNzIsImV4cCI6MjA2NjQzNzA3Mn0.C7fxfvW5jzi4kzb3V9986CLBQlNX4xkipGJjovC7RYU";

export const supabase = createClient(supabaseUrl, supabaseKey);
