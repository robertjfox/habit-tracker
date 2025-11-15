import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://eelrufbzrhtctlkonvfq.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbHJ1ZmJ6cmh0Y3Rsa29udmZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMzM3NDIsImV4cCI6MjA3MTcwOTc0Mn0.lY_Eq4H8SUohc6_172uLtfQwaRD7vVdcgWwFL9l8e4Y";

export const supabase = createClient(supabaseUrl, supabaseKey);
