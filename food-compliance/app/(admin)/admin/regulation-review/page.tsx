import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RegulationReviewClient from "./RegulationReviewClient";

export const metadata: Metadata = { title: "Regulation Review Queue" };

export default async function RegulationReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db = supabase as any; // eslint-disable-line

  const { data: queueItems } = await db
    .from("regulation_review_queue")
    .select("*")
    .in("status", ["pending", "ai_processed"])
    .order("created_at", { ascending: false });

  return <RegulationReviewClient initialItems={queueItems ?? []} />;
}
