"use client";

import { useState } from "react";
import { labToRgb } from "@/lib/color";

/**
 * 투명도 시뮬레이션 — 잉크 Lab + 베이스 Lab으로 인쇄 결과 미리보기
 * showSlider=true 이면 슬라이더 표시, false 이면 opacityScore 고정
 */

interface Props {
  inkL: number; inkA: number; inkB: number;
  baseL?: number; baseA?: number; baseB?: number;
  opacityScore?: number; // 0~100, 있으면 이 값으로 고정
  showSlider?: boolean;
  label?: string;
}

function blendLab(
  inkL: number, inkA: number, inkB: number,
  baseL: number, baseA: number, baseB: number,
  t: number // 0~1, 잉크 비율
) {
  return {
    L: inkL * t + baseL * (1 - t),
    a: inkA * t + baseA * (1 - t),
    b: inkB * t + baseB * (1 - t),
  };
}

function ColorChip({ color, label, size = 36 }: { color: string; label: string; size?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div style={{ width: size, height: size, borderRadius: 6, border: "1px solid #d1d5db", background: color }} />
      <span style={{ fontSize: 9, color: "#9ca3af", whiteSpace: "nowrap" }}>{label}</span>
    </div>
  );
}

export default function TransparencySimulator({
  inkL, inkA, inkB,
  baseL = 94, baseA = 0, baseB = 0,
  opacityScore,
  showSlider = true,
  label = "투명도 시뮬레이션",
}: Props) {
  const [sliderVal, setSliderVal] = useState(opacityScore ?? 80);
  const opacity = showSlider ? sliderVal : (opacityScore ?? 80);

  const blended = blendLab(inkL, inkA, inkB, baseL, baseA, baseB, opacity / 100);
  const inkColor = labToRgb(inkL, inkA, inkB);
  const baseColor = labToRgb(baseL, baseA, baseB);
  const resultColor = labToRgb(blended.L, blended.a, blended.b);

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>{label}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <ColorChip color={baseColor} label="베이스" />
        <span style={{ fontSize: 12, color: "#9ca3af" }}>+</span>
        <ColorChip color={inkColor} label={`잉크 ${opacity.toFixed(0)}%`} />
        <span style={{ fontSize: 12, color: "#9ca3af" }}>→</span>
        <ColorChip color={resultColor} label="결과" size={44} />
      </div>
      {showSlider && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
          <span style={{ fontSize: 11, color: "#6b7280" }}>0%</span>
          <input
            type="range" min={0} max={100} value={sliderVal}
            onChange={e => setSliderVal(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: 11, color: "#6b7280" }}>100%</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", minWidth: 36 }}>{sliderVal}%</span>
        </div>
      )}
    </div>
  );
}
