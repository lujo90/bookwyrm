"use client";

import { Leaf, ChevronRight } from "lucide-react";

interface AgentBarProps {
  /** Message displayed in the bar */
  message: string;
  /** Called when the bar is tapped — use to open the agent panel */
  onClick?: () => void;
}

/**
 * AgentBar
 *
 * Fixed 44px bar shown at the top of every authenticated page.
 * Background: #EFF6FF  |  Border-bottom: 1px solid #BFDBFE
 *
 * Layout (left → right):
 *   22px blue circle with Leaf icon  |  message text  |  ChevronRight
 */
export default function AgentBar({ message, onClick }: AgentBarProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      style={{
        height:          44,
        backgroundColor: "#EFF6FF",
        borderBottom:    "1px solid #BFDBFE",
        display:         "flex",
        alignItems:      "center",
        paddingLeft:     14,
        paddingRight:    14,
        gap:             10,
        cursor:          onClick ? "pointer" : "default",
        width:           "100%",
        userSelect:      "none",
      }}
    >
      {/* Leaf icon in blue circle */}
      <div
        style={{
          width:           22,
          height:          22,
          borderRadius:    "50%",
          backgroundColor: "#2563EB",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          flexShrink:      0,
        }}
      >
        <Leaf size={12} color="white" strokeWidth={2.5} />
      </div>

      {/* Message text */}
      <span
        style={{
          flex:         1,
          fontSize:     13,
          fontWeight:   500,
          color:        "#2563EB",
          fontFamily:   "var(--font-body), DM Sans, sans-serif",
          overflow:     "hidden",
          textOverflow: "ellipsis",
          whiteSpace:   "nowrap",
          lineHeight:   1,
        }}
      >
        {message}
      </span>

      {/* Chevron */}
      <ChevronRight size={16} color="#2563EB" style={{ flexShrink: 0, opacity: 0.6 }} />
    </div>
  );
}
