export interface AccessResult {
  allowed: boolean;
  reason:  "ok" | "trial_expired" | "trial_limit" | "plan_limit" | "subscription_inactive";
}

export async function canCreateProduct(db: any, organisationId: string): Promise<AccessResult> {
  const { data: org, error } = await db
    .from("organisations")
    .select("subscription_status, trial_ends_at, sku_limit")
    .eq("id", organisationId)
    .single();

  if (error || !org) return { allowed: false, reason: "subscription_inactive" };

  const { subscription_status, trial_ends_at, sku_limit } = org;

  // Count active (non-archived) products
  const { count } = await db
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", organisationId)
    .neq("status", "archived");

  const productCount = count ?? 0;

  if (subscription_status === "trial") {
    if (trial_ends_at && new Date(trial_ends_at) < new Date()) {
      return { allowed: false, reason: "trial_expired" };
    }
    if (productCount >= sku_limit) {
      return { allowed: false, reason: "trial_limit" };
    }
    return { allowed: true, reason: "ok" };
  }

  if (subscription_status === "active") {
    if (productCount >= sku_limit) {
      return { allowed: false, reason: "plan_limit" };
    }
    return { allowed: true, reason: "ok" };
  }

  // cancelled | past_due
  return { allowed: false, reason: "subscription_inactive" };
}
