/**
 * ScoreGauge
 *
 * A circular SVG gauge that shows a compliance score from 0 to 100.
 *
 * Colour bands:
 *   0–24   → danger  (#DC2626)
 *   25–74  → warning (#D97706)
 *   75–89  → primary (#2563EB)
 *   90–100 → success (#16A34A)
 *
 * Sizes:
 *   sm → 64px   (score text 18px)
 *   md → 96px   (score text 24px)
 *   lg → 128px  (score text 32px)
 */

interface ScoreGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: { px: 64,  textSize: 18, stroke: 6  },
  md: { px: 96,  textSize: 24, stroke: 8  },
  lg: { px: 128, textSize: 32, stroke: 10 },
};

function getColor(score: number): string {
  if (score < 25) return "#DC2626"; // danger
  if (score < 75) return "#D97706"; // warning
  if (score < 90) return "#2563EB"; // primary
  return "#16A34A";                 // success
}

export default function ScoreGauge({ score, size = "md" }: ScoreGaugeProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  const { px, textSize, stroke } = SIZE_MAP[size];

  const center = px / 2;
  const radius = center - stroke / 2 - 2; // small inset so stroke doesn't clip
  const circumference = 2 * Math.PI * radius;
  const progress = (clamped / 100) * circumference;
  const color = getColor(clamped);

  return (
    <svg
      width={px}
      height={px}
      viewBox={`0 0 ${px} ${px}`}
      aria-label={`Compliance score: ${clamped}%`}
      role="img"
    >
      {/* Track ring */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#E2E8F0"
        strokeWidth={stroke}
      />
      {/* Progress arc — starts at 12 o'clock (-90 deg) */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${progress} ${circumference}`}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
      {/* Score label */}
      <text
        x={center}
        y={center}
        dominantBaseline="central"
        textAnchor="middle"
        fontSize={textSize}
        fontWeight="700"
        fill={color}
        fontFamily="var(--font-dm-sans), sans-serif"
      >
        {clamped}
      </text>
    </svg>
  );
}
