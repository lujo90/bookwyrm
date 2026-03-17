import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Regulation, RegulationStatus } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusVariant(
  status: RegulationStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "under_review":
      return "secondary";
    case "superseded":
      return "outline";
    default:
      return "outline";
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function RegulationsAdminPage() {
  // Auth guard: check for a Supabase session cookie.
  // In a real app wire this to your auth provider (Supabase Auth, NextAuth, etc.)
  const cookieStore = cookies();
  const sessionToken =
    cookieStore.get("sb-access-token")?.value ??
    cookieStore.get("supabase-auth-token")?.value;

  if (!sessionToken) {
    redirect("/login");
  }

  const supabase = createServerClient();

  const { data: regulations, error } = await supabase
    .from("regulations")
    .select(
      "id, code, title, status, last_updated, version, markets, applies_to"
    )
    .order("code", { ascending: true });

  if (error) {
    throw new Error(`Failed to load regulations: ${error.message}`);
  }

  const rows = (regulations ?? []) as Pick<
    Regulation,
    "id" | "code" | "title" | "status" | "last_updated" | "version" | "markets" | "applies_to"
  >[];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Regulations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {rows.length} regulation{rows.length !== 1 ? "s" : ""} in the
            database
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/regulations/new">+ Add regulation</Link>
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-28">Markets</TableHead>
              <TableHead className="w-36">Last updated</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-10"
                >
                  No regulations found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((reg) => (
                <TableRow key={reg.id}>
                  <TableCell className="font-mono text-sm font-medium">
                    {reg.code}
                  </TableCell>
                  <TableCell className="max-w-xs truncate" title={reg.title}>
                    {reg.title}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(reg.status)}>
                      {reg.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {reg.markets?.join(", ") ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(reg.last_updated)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/regulations/${reg.id}/edit`}>
                        Edit
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
