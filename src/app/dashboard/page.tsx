"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

function labToRgb(L: number, a: number, b: number): string {
  let y = (L + 16) / 116;
  let x = a / 500 + y;
  let z = y - b / 200;
  x = 0.95047 * (x * x * x > 0.008856 ? x * x * x : (x - 16 / 116) / 7.787);
  y = 1.0 * (y * y * y > 0.008856 ? y * y * y : (y - 16 / 116) / 7.787);
  z = 1.08883 * (z * z * z > 0.008856 ? z * z * z : (z - 16 / 116) / 7.787);
  let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let bVal = x * 0.0557 + y * -0.204 + z * 1.057;
  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
  bVal = bVal > 0.0031308 ? 1.055 * Math.pow(bVal, 1 / 2.4) - 0.055 : 12.92 * bVal;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return `rgb(${clamp(r)},${clamp(g)},${clamp(bVal)})`;
}

interface Group { group_id: number; group_name: string; }
interface Color {
  color_id: number; group_id: number | null; color_name: string;
  status: string; customer?: string; product?: string;
  target_L?: number; target_a?: number; target_b?: number;
  registered_at?: string; updated_at?: string;
}
interface Round { round_id: number; color_id: number; round_number: number; registered_at?: string; }
interface Sample {
  sample_id: number; round_id: number; sample_number: number;
  recipe_name?: string; delta_E?: number; is_confirmed?: boolean;
  print_L_SCI?: number; print_a_SCI?: number; print_b_SCI?: number;
  work_date?: string; registered_at?: string; updated_at?: string;
}
interface Ink { ink_id: number; ink_name: string; }
interface Plate { plate_id: number; plate_code?: string; plate_name?: string; }
interface Pad { pad_id: number; pad_code?: string; }
interface BaseColorType { base_color_id: number; base_color_name: string; }

export default function DashboardPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [inks, setInks] = useState<Ink[]>([]);
  const [plates, setPlates] = useState<Plate[]>([]);
  const [pads, setPads] = useState<Pad[]>([]);
  const [baseColors, setBaseColors] = useState<BaseColorType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [r1, r2, r3, r4, r5, r6, r7, r8] = await Promise.all([
          api.get("/api/groups/"), api.get("/api/colors/"),
          api.get("/api/rounds/"), api.get("/api/samples/"),
          api.get("/api/inks/"), api.get("/api/plates/"),
          api.get("/api/pads/"), api.get("/api/base-colors/"),
        ]);
        setGroups(r1.data); setColors(r2.data);
        setRounds(r3.data); setSamples(r4.data);
        setInks(r5.data); setPlates(r6.data);
        setPads(r7.data); setBaseColors(r8.data);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  // ============ 통계 계산 ============
  const totalColors = colors.length;
  const inProgressColors = colors.filter(c => c.status === "in_progress").length;
  const confirmedColors = colors.filter(c => c.status === "confirmed").length;
  const totalSamples = samples.length;
  const confirmedSamples = samples.filter(s => s.is_confirmed).length;
  const totalRounds = rounds.length;

  // 평균 ΔE
  const samplesWithDE = samples.filter(s => s.delta_E != null && s.delta_E !== undefined);
  const avgDeltaE = samplesWithDE.length > 0
    ? (samplesWithDE.reduce((sum, s) => sum + (s.delta_E || 0), 0) / samplesWithDE.length).toFixed(2)
    : "-";
  const minDeltaE = samplesWithDE.length > 0
    ? Math.min(...samplesWithDE.map(s => s.delta_E!)).toFixed(2)
    : "-";
  const maxDeltaE = samplesWithDE.length > 0
    ? Math.max(...samplesWithDE.map(s => s.delta_E!)).toFixed(2)
    : "-";

  // ΔE 분포
  const deUnder1 = samplesWithDE.filter(s => s.delta_E! < 1).length;
  const de1to3 = samplesWithDE.filter(s => s.delta_E! >= 1 && s.delta_E! < 3).length;
  const de3to6 = samplesWithDE.filter(s => s.delta_E! >= 3 && s.delta_E! < 6).length;
  const deOver6 = samplesWithDE.filter(s => s.delta_E! >= 6).length;

  // 최근 샘플 (최신순 10개)
  const recentSamples = [...samples]
    .sort((a, b) => {
      const da = a.updated_at || a.registered_at || "";
      const db2 = b.updated_at || b.registered_at || "";
      return db2.localeCompare(da);
    })
    .slice(0, 10);

  // 컬러별 최소 ΔE
  const colorBestDE: { color: Color; bestDE: number; sampleCount: number; roundCount: number }[] = [];
  colors.forEach(c => {
    const colorRounds = rounds.filter(r => r.color_id === c.color_id);
    const roundIds = colorRounds.map(r => r.round_id);
    const colorSamples = samples.filter(s => roundIds.includes(s.round_id));
    const withDE = colorSamples.filter(s => s.delta_E != null);
    if (withDE.length > 0) {
      const bestDE = Math.min(...withDE.map(s => s.delta_E!));
      colorBestDE.push({ color: c, bestDE, sampleCount: colorSamples.length, roundCount: colorRounds.length });
    }
  });
  colorBestDE.sort((a, b) => a.bestDE - b.bestDE);

  // 그룹별 컬러 수
  const groupColorCount = groups.map(g => ({
    group: g,
    count: colors.filter(c => c.group_id === g.group_id).length,
    inProgress: colors.filter(c => c.group_id === g.group_id && c.status === "in_progress").length,
    confirmed: colors.filter(c => c.group_id === g.group_id && c.status === "confirmed").length,
  }));

  // ΔE 바 차트 (컬러별)
  const deBarMax = colorBestDE.length > 0 ? Math.max(...colorBestDE.map(c => c.bestDE), 10) : 10;

  if (loading) {
    return (
      <div style={{ maxWidth: 960, margin: "0 auto", padding: 16, textAlign: "center", paddingTop: 100 }}>
        <div style={{ fontSize: 18, color: "#666" }}>데이터 로딩 중...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>대시보드</h1>
        <button onClick={() => router.push("/")} style={{ padding: "6px 16px", background: "#6b7280", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
          ← 메인
        </button>
      </div>

      {/* 상단 요약 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#2563eb" }}>{totalColors}</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>전체 컬러</div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
            진행 <span style={{ color: "#f59e0b", fontWeight: 600 }}>{inProgressColors}</span> · 확정 <span style={{ color: "#10b981", fontWeight: 600 }}>{confirmedColors}</span>
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#7c3aed" }}>{totalSamples}</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>전체 샘플</div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
            확정 <span style={{ color: "#10b981", fontWeight: 600 }}>{confirmedSamples}</span> · 라운드 <span style={{ fontWeight: 600 }}>{totalRounds}</span>
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: avgDeltaE !== "-" && parseFloat(avgDeltaE) < 3 ? "#10b981" : "#f59e0b" }}>{avgDeltaE}</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>평균 ΔE</div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
            최소 <span style={{ color: "#10b981", fontWeight: 600 }}>{minDeltaE}</span> · 최대 <span style={{ color: "#ef4444", fontWeight: 600 }}>{maxDeltaE}</span>
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#0891b2" }}>{inks.length}</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>마스터 잉크</div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
            동판 <span style={{ fontWeight: 600 }}>{plates.length}</span> · 패드 <span style={{ fontWeight: 600 }}>{pads.length}</span> · 베이스 <span style={{ fontWeight: 600 }}>{baseColors.length}</span>
          </div>
        </div>
      </div>

      {/* 중간 행 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* ΔE 분포 */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>ΔE 분포</h2>
          {samplesWithDE.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: "#999", fontSize: 13 }}>ΔE 데이터 없음</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "ΔE < 1 (우수)", count: deUnder1, color: "#10b981", bg: "#ecfdf5" },
                { label: "1 ≤ ΔE < 3 (양호)", count: de1to3, color: "#3b82f6", bg: "#eff6ff" },
                { label: "3 ≤ ΔE < 6 (보통)", count: de3to6, color: "#f59e0b", bg: "#fffbeb" },
                { label: "ΔE ≥ 6 (미흡)", count: deOver6, color: "#ef4444", bg: "#fef2f2" },
              ].map(item => {
                const pct = samplesWithDE.length > 0 ? (item.count / samplesWithDE.length) * 100 : 0;
                return (
                  <div key={item.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                      <span style={{ color: item.color, fontWeight: 600 }}>{item.label}</span>
                      <span style={{ color: "#666" }}>{item.count}건 ({pct.toFixed(0)}%)</span>
                    </div>
                    <div style={{ height: 18, background: "#f3f4f6", borderRadius: 9, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: item.color, borderRadius: 9, transition: "width 0.5s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 그룹별 현황 */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>그룹별 현황</h2>
          {groupColorCount.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: "#999", fontSize: 13 }}>그룹 없음</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {groupColorCount.map(gc => (
                <div key={gc.group.group_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "#f8f9fa", borderRadius: 6 }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{gc.group.group_name}</span>
                  <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 600 }}>{gc.count}컬러</span>
                  <span style={{ fontSize: 10, color: "#f59e0b" }}>진행 {gc.inProgress}</span>
                  <span style={{ fontSize: 10, color: "#10b981" }}>확정 {gc.confirmed}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 컬러별 Best ΔE 바 차트 */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>컬러별 최소 ΔE</h2>
        {colorBestDE.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: "#999", fontSize: 13 }}>ΔE 데이터 없음</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {colorBestDE.slice(0, 15).map(item => {
              const pct = (item.bestDE / deBarMax) * 100;
              const barColor = item.bestDE < 1 ? "#10b981" : item.bestDE < 3 ? "#3b82f6" : item.bestDE < 6 ? "#f59e0b" : "#ef4444";
              return (
                <div key={item.color.color_id} style={{ cursor: "pointer" }} onClick={() => router.push(`/colors/${item.color.color_id}`)}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600 }}>
                      {item.color.color_name}
                      {item.color.target_L != null && (
                        <span style={{ marginLeft: 6, display: "inline-block", width: 12, height: 12, borderRadius: 3, verticalAlign: "middle", border: "1px solid #ccc", background: labToRgb(item.color.target_L!, item.color.target_a!, item.color.target_b!) }} />
                      )}
                    </span>
                    <span style={{ color: barColor, fontWeight: 700 }}>ΔE {item.bestDE.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 14, background: "#f3f4f6", borderRadius: 7, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: barColor, borderRadius: 7, transition: "width 0.5s" }} />
                    </div>
                    <span style={{ fontSize: 10, color: "#999", whiteSpace: "nowrap" }}>{item.roundCount}R · {item.sampleCount}S</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 최근 샘플 */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>최근 작업 샘플</h2>
        {recentSamples.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: "#999", fontSize: 13 }}>샘플 없음</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {recentSamples.map(s => {
              const rd = rounds.find(r => r.round_id === s.round_id);
              const col = rd ? colors.find(c => c.color_id === rd.color_id) : null;
              const deColor = s.delta_E == null ? "#999" : s.delta_E < 1 ? "#10b981" : s.delta_E < 3 ? "#3b82f6" : s.delta_E < 6 ? "#f59e0b" : "#ef4444";
              return (
                <div key={s.sample_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: s.is_confirmed ? "#f0fdf4" : "#f8f9fa", borderRadius: 6, cursor: col ? "pointer" : "default", borderLeft: s.is_confirmed ? "3px solid #10b981" : "3px solid transparent" }}
                  onClick={() => col && router.push(`/colors/${col.color_id}`)}>

                  {s.print_L_SCI != null && s.print_a_SCI != null && s.print_b_SCI != null && (
                    <div style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #ccc", background: labToRgb(s.print_L_SCI, s.print_a_SCI, s.print_b_SCI), flexShrink: 0 }} />
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>
                      {col?.color_name || "?"} — R{rd?.round_number || "?"}-S{s.sample_number}
                      {s.recipe_name && <span style={{ color: "#888", fontWeight: 400 }}> ({s.recipe_name})</span>}
                    </div>
                    <div style={{ fontSize: 10, color: "#999" }}>
                      {s.work_date || (s.updated_at ? new Date(s.updated_at).toLocaleDateString("ko-KR") : "")}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: deColor }}>
                      {s.delta_E != null ? `ΔE ${s.delta_E.toFixed(2)}` : "-"}
                    </div>
                    {s.is_confirmed && <span style={{ fontSize: 9, background: "#10b981", color: "#fff", padding: "1px 4px", borderRadius: 3 }}>확정</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
