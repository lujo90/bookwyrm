import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RegulationsClient from "./RegulationsClient";

export const metadata: Metadata = { title: "Regulations" };

export default async function RegulationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: regulations } = await (supabase as any)
    .from("regulations")
    .select("*")
    .order("code");

  return <RegulationsClient regulations={regulations ?? []} />;
}
