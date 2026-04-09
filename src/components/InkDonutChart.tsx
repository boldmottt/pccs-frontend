"use client";

/**
 * 잉크 카테고리별 도넛 차트 (순수 SVG, 라이브러리 없음)
 * categories: { label, value, color }[]
 */

interface Slice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: Slice[];
  size?: number;
  thickness?: number;
  title?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  color: "#3b82f6",
  transparent: "#10b981",
  effect: "#8b5cf6",
  additive: "#f59e0b",
};

const CATEGORY_LABELS: Record<string, string> = {
  color: "칼라",
  transparent: "희석제",
  effect: "이펙트",
  additive: "첨가제",
};

export function inkCategorySlices(inks: { ink_category: string }[]): Slice[] {
  const counts: Record<string, number> = {};
  for (const ink of inks) {
    counts[ink.ink_category] = (counts[ink.ink_category] || 0) + 1;
  }
  return Object.entries(counts).map(([key, value]) => ({
    label: CATEGORY_LABELS[key] || key,
    value,
    color: CATEGORY_COLORS[key] || "#94a3b8",
  }));
}

export default function InkDonutChart({ data, size = 160, thickness = 32, title }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const slices = data.map((d) => {
    const pct = d.value / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const rotate = offset * 360 - 90;
    offset += pct;
    return { ...d, dash, gap, rotate };
  });

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      {title && <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{title}</div>}
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          {slices.map((s, i) => (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={-slices.slice(0, i).reduce((a, b) => a + b.dash, 0)}
              style={{ transition: "stroke-dasharray 0.3s" }}
            />
          ))}
          {/* 배경 원 */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={thickness} style={{ zIndex: -1 }} />
        </svg>
        {/* 중앙 텍스트 */}
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#1f2937" }}>{total}</span>
          <span style={{ fontSize: 10, color: "#6b7280" }}>종</span>
        </div>
      </div>
      {/* 범례 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", justifyContent: "center" }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#4b5563" }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
            {s.label} ({s.value})
          </div>
        ))}
      </div>
    </div>
  );
}
