import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  normalizeSiteContent,
  SiteContent
} from "@/lib/siteContentShared";

export const getSiteContent = cache(async () => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return normalizeSiteContent(null);
  }

  const { data, error } = await supabase
    .from("site_content")
    .select("*")
    .eq("key", "default")
    .maybeSingle();

  if (error || !data) {
    return normalizeSiteContent(null);
  }

  return normalizeSiteContent(data as Partial<SiteContent>);
});
