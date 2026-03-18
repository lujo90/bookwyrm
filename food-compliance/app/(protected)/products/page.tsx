import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return (
    <AppShell activeTab="products">
      <div className="p-4">
        <h1 className="text-xl font-bold text-dark mb-1">Products</h1>
        <p className="text-sm text-light">
          Your product list will appear here.
        </p>
      </div>
    </AppShell>
  );
}
