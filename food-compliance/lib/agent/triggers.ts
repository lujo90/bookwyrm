/**
 * Agent trigger messages
 *
 * Pure functions that return proactive messages the agent sends in response to
 * product lifecycle events. These are inserted into agent_messages via server
 * actions / API routes — never called client-side.
 */

// ─── Product created ──────────────────────────────────────────────────────────

export function onProductCreated(productName: string): string {
  return (
    `Welcome! I've set up your compliance checklist for **${productName}**. ` +
    `Here are your 3 priorities to get started:\n\n` +
    `1. **Add your formula** — upload or enter your ingredient list so I can detect allergens automatically.\n` +
    `2. **Upload your first document** — a spec sheet or lab report gets you to 30% quickly.\n` +
    `3. **Check your blocking items** — these must be completed before the product can be approved for retail.`
  );
}

// ─── Formula saved ────────────────────────────────────────────────────────────

export function onFormulaSaved(allergens: string[]): string {
  if (allergens.length === 0) {
    return (
      `Formula saved. No EU 14 allergens detected in this version. ` +
      `Remember to declare any cross-contamination risks in the "may contain" section of your label.`
    );
  }

  const list = allergens.join(", ");
  return (
    `Formula saved. I detected the following EU 14 allergens: **${list}**. ` +
    `These must be emphasised (bold or italic) in your ingredient list on the label under EU 1169/2011 Annex II. ` +
    `I've updated the relevant checklist items for you.`
  );
}

// ─── Document uploaded ────────────────────────────────────────────────────────

export function onDocumentUploaded(docName: string, docType: string): string {
  const typeLabels: Record<string, string> = {
    spec_sheet:    "product specification",
    lab_report:    "lab report",
    certificate:   "certificate",
    declaration:   "declaration",
    label_artwork: "label artwork",
    other:         "document",
  };
  const label = typeLabels[docType] ?? "document";

  return (
    `Got it — your ${label} **${docName}** has been uploaded. ` +
    `I've ticked the relevant checklist items. ` +
    `If this document has an expiry date, make sure to set it so I can alert you before it lapses.`
  );
}

// ─── Document expiring soon ───────────────────────────────────────────────────

export function onDocumentExpiringSoon(docName: string, daysLeft: number): string {
  return (
    `⚠️ Your document **${docName}** expires in **${daysLeft} day${daysLeft === 1 ? "" : "s"}**. ` +
    `Renew it and upload the updated version before expiry to keep your compliance score intact.`
  );
}

// ─── Score milestone: 75% ────────────────────────────────────────────────────

export function onScoreReached75(productName: string): string {
  return (
    `Great progress! **${productName}** has reached 75% readiness. ` +
    `You're in the final stretch. Focus on completing any remaining blocking items — ` +
    `those are the last gates before your product can be approved for retail listing.`
  );
}

// ─── Score milestone: 100% ───────────────────────────────────────────────────

export function onScoreReached100(productName: string): string {
  return (
    `🎉 **${productName}** is 100% ready! All compliance requirements are met. ` +
    `You can now submit for final review. Remember to keep documents up to date — ` +
    `I'll alert you if anything approaches expiry.`
  );
}
