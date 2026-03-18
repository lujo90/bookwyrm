import type { Metadata } from "next";

export const metadata: Metadata = { title: "Shared Report" };

interface Props {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm border border-slate-100">
        <h1 className="text-2xl font-bold text-dark mb-2">Shared Compliance Report</h1>
        <p className="text-sm text-light">
          Report for token: <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">{token}</code>
        </p>
        {/* Shared report content rendered in a later phase */}
      </div>
    </main>
  );
}
