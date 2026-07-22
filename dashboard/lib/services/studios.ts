import { supabase } from "@/lib/supabase/server";

export async function getStudios() {
  const { data, error } = await supabase
    .from("studios")
    .select(`
      id,
      studio_code,
      studio_name,
      city,
      state
    `)
    .eq("active", true)
    .order("studio_name");

  if (error) {
    console.error(error);
    throw new Error("Unable to load studios.");
  }

  return data;
}