"use client";

/**
 * 은폐력 반원 게이지 (순수 SVG)
 * score: 0~100
 */

interface Props {
  score: number | null | undefined;
  size?: number;
  label?: string;
}

export default function OpacityGauge({ score, size = 120, label = "은폐력" }: Props) {
  const r = (size - 16) / 2;
  const cx = size / 2;
  const cy = size / 2 + 8;
  const circumference = Math.PI * r; // 반원

  const pct = score != null ? Math.max(0, Math.min(100, score)) / 100 : 0;
  const dash = pct * circumference;
  const gap = circumference - dash;

  const color =
    score == null ? "#d1d5db"
    : score >= 80 ? "#10b981"
    : score >= 50 ? "#3b82f6"
    : score >= 30 ? "#f59e0b"
    : "#ef4444";

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>{label}</div>
      <div style={{ position: "relative", width: size, height: size / 2 + 12 }}>
        <svg width={size} height={size / 2 + 12}>
          {/* 배경 반원 */}
          <path
            d={`M ${16 / 2} ${cy} A ${r} ${r} 0 0 1 ${size - 16 / 2} ${cy}`}
            fill="none" stroke="#f3f4f6" strokeWidth={12} strokeLinecap="round"
          />
          {/* 값 반원 */}
          <path
            d={`M ${16 / 2} ${cy} A ${r} ${r} 0 0 1 ${size - 16 / 2} ${cy}`}
            fill="none" stroke={color} strokeWidth={12} strokeLinecap="round"
            strokeDasharray={`${dash} ${gap}`}
            style={{ transition: "stroke-dasharray 0.4s, stroke 0.4s" }}
          />
        </svg>
        {/* 중앙 텍스트 */}
        <div style={{
          position: "absolute", bottom: 2, left: 0, right: 0,
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: score != null ? color : "#9ca3af" }}>
            {score != null ? `${score.toFixed(1)}%` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
