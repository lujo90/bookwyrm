"use client";

import * as Popover from "@radix-ui/react-popover";
import { ExternalLink, X } from "lucide-react";

interface ComplianceAnchorProps {
  /** Regulation code shown on the tag, e.g. "EU 1169/2011" */
  code: string;
  /** Full name of the regulation, e.g. "Food Information to Consumers" */
  name: string;
  /** Specific article referenced, e.g. "Article 9" */
  article?: string;
  /** Short plain-English explanation of what this regulation requires */
  plainEnglish: string;
  /** Direct link to EUR-Lex for the full legal text */
  eurLexUrl: string;
}

/**
 * ComplianceAnchor
 *
 * A small clickable tag that shows a regulation code.
 * Clicking it opens a Radix Popover with:
 *  - Regulation name
 *  - Article
 *  - Plain-English explanation
 *  - Link to EUR-Lex
 */
export default function ComplianceAnchor({
  code,
  name,
  article,
  plainEnglish,
  eurLexUrl,
}: ComplianceAnchorProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
          aria-label={`View regulation ${code}`}
        >
          {code}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={6}
          className="z-50 w-72 rounded-xl bg-white shadow-lg border border-slate-200 p-4 text-sm"
        >
          {/* Close button */}
          <Popover.Close
            className="absolute top-3 right-3 text-light hover:text-mid transition-colors"
            aria-label="Close"
          >
            <X size={14} />
          </Popover.Close>

          {/* Header */}
          <p className="text-xs font-bold text-primary uppercase tracking-wide mb-0.5">
            {code}
          </p>
          <p className="font-semibold text-dark leading-snug mb-1">{name}</p>
          {article && (
            <p className="text-xs text-light mb-3">{article}</p>
          )}

          {/* Plain English */}
          <p className="text-xs text-mid leading-relaxed mb-3">{plainEnglish}</p>

          {/* EUR-Lex link */}
          <a
            href={eurLexUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
          >
            Read full text on EUR-Lex
            <ExternalLink size={11} />
          </a>

          <Popover.Arrow className="fill-white stroke-slate-200 stroke-[0.5]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
