import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://aixrmofttysnoquljnre.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpeHJtb2Z0dHlzbm9xdWxqbnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyODQ5NDgsImV4cCI6MjA5Nzg2MDk0OH0.ETqYt9xxQp_ikw1Z4ytloUyrq2_bK2SA7Y-bY6vSerE";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
