import { fetchAllRows } from "@/lib/supabase/pagination"
import { supabase } from "@/lib/supabase/server";

export async function getStudios(allowedStudioIds: number[] = []) {
  let query = supabase
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
  if (allowedStudioIds) query = query.in("id", allowedStudioIds)

  const { data, error } = await fetchAllRows(query.order("id"))

  if (error) {
    console.error(error);
    throw new Error("Unable to load studios.");
  }

  return data;
}
