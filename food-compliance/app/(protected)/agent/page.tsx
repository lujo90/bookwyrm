import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";
import IngredientAgentClient from "./IngredientAgentClient";

export const metadata: Metadata = { title: "Ingredient Agent" };

export default function AgentPage() {
  return (
    <AppShell activeTab="agent">
      <IngredientAgentClient />
    </AppShell>
  );
}
