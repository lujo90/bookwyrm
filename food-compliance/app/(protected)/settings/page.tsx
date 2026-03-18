import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <AppShell activeTab="settings">
      <div className="p-4">
        <h1 className="text-xl font-bold text-dark mb-1">Settings</h1>
        <p className="text-sm text-light">
          Account and organisation settings will appear here.
        </p>
      </div>
    </AppShell>
  );
}
