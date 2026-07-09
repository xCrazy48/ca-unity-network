import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns papers filtered by the current user's level (inter/final) and
 * exam group (group_1 / group_2 / both). Papers without a level (legacy rows)
 * are treated as CA Inter.
 */
export function useUserPapers() {
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => (await supabase.from("profiles").select("*").maybeSingle()).data,
  });

  const { data: allPapers, ...rest } = useQuery({
    queryKey: ["papers"],
    queryFn: async () =>
      (await supabase.from("papers").select("*").order("sort_order")).data ?? [],
  });

  const level = (profile as { level?: string } | null)?.level ?? "inter";
  const group = profile?.exam_group ?? "both";

  const papers = (allPapers ?? []).filter((p) => {
    const paperLevel = (p as { level?: string }).level ?? "inter";
    if (paperLevel !== level) return false;
    if (group === "both") return true;
    return p.paper_group === group;
  });

  return { data: papers, profile, ...rest };
}
