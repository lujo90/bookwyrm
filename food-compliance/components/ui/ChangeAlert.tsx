"use client";

import { useState } from "react";

interface ChangeAlertProps {
  notifications: string[];
  onDismiss:     () => void;
}

/**
 * ChangeAlert
 *
 * Yellow sticky banner rendered below the product name when a cascade has
 * occurred. Shows what changed and what was reset. Dismissible by the user.
 *
 * Multiple notifications are collapsed: the first is shown in full,
 * and remaining items appear as an expandable "+N more" chip.
 */
export default function ChangeAlert({ notifications, onDismiss }: ChangeAlertProps) {
  const [expanded, setExpanded] = useState(false);

  if (notifications.length === 0) return null;

  const first = notifications[0];
  const rest  = notifications.slice(1);

  return (
    <div
      role="alert"
      style={{
        backgroundColor: "#FFFBEB",
        borderBottom:    "1px solid #FDE68A",
        padding:         "10px 16px",
        display:         "flex",
        alignItems:      "flex-start",
        gap:             8,
      }}
    >
      {/* Icon */}
      <span style={{ fontSize: 16, lineHeight: 1.5, flexShrink: 0 }}>⚠️</span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin:     0,
            fontSize:   13,
            fontWeight: 600,
            color:      "#92400E",
            fontFamily: "var(--font-body), DM Sans, sans-serif",
            lineHeight: 1.5,
          }}
        >
          {first}
        </p>

        {/* Expandable additional notifications */}
        {rest.length > 0 && (
          <>
            {expanded && (
              <ul style={{ margin: "6px 0 0", padding: "0 0 0 4px", listStyle: "none" }}>
                {rest.map((n, idx) => (
                  <li
                    key={idx}
                    style={{
                      fontSize:   12,
                      color:      "#92400E",
                      fontFamily: "var(--font-body), DM Sans, sans-serif",
                      lineHeight: 1.5,
                      marginTop:  4,
                    }}
                  >
                    · {n}
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => setExpanded((v) => !v)}
              style={{
                marginTop:       6,
                fontSize:        11,
                fontWeight:      700,
                color:           "#92400E",
                fontFamily:      "var(--font-body), DM Sans, sans-serif",
                background:      "none",
                border:          "none",
                padding:         0,
                cursor:          "pointer",
                textDecoration:  "underline",
                textUnderlineOffset: 2,
              }}
            >
              {expanded ? "Show less" : `+${rest.length} more`}
            </button>
          </>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          flexShrink:     0,
          background:     "none",
          border:         "none",
          padding:        0,
          cursor:         "pointer",
          fontSize:       18,
          lineHeight:     1,
          color:          "#D97706",
          marginTop:      1,
        }}
      >
        ×
      </button>
    </div>
  );
}
