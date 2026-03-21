import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditRegulationClient from "./EditRegulationClient";

export const metadata: Metadata = { title: "Edit Regulation" };

export default async function EditRegulationPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db = supabase as any;

  const { data: regulation } = await db
    .from("regulations")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!regulation) notFound();

  const { data: versions } = await db
    .from("regulation_versions")
    .select("*")
    .eq("regulation_id", params.id)
    .order("version", { ascending: false });

  return (
    <EditRegulationClient
      regulation={regulation}
      versions={versions ?? []}
    />
  );
}
