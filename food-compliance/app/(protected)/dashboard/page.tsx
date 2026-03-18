import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <AppShell activeTab="dashboard">
      <div className="p-4">
        <h1 className="text-xl font-bold text-dark mb-1">Dashboard</h1>
        <p className="text-sm text-light">
          Your compliance overview will appear here.
        </p>
      </div>
    </AppShell>
  );
}
