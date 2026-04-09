"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { labToRgb } from "@/lib/color";

interface DashboardStats {
  patterns: { total: number; in_progress: number; confirmed: number; hold: number };
  samples: { total: number; confirmed: number };
  delta_E: {
    avg: number | null; min: number | null; max: number | null;
    distribution: { under_1: number; "1_to_3": number; "3_to_6": number; over_6: number };
  };
  master: { groups: number; rounds: number; inks: number; plates: number; pads: number; base_colors: number; ink_colors: number };
  recent_patterns: {
    pattern_id: number;
    pattern_name: string;
    status: string;
    color_count: number;
  }[];
  recent_samples: {
    sample_id: number;
    sample_number: number;
    delta_E: number | null;
    is_confirmed: boolean | null;
    print_L_SCI?: number;
    print_a_SCI?: number;
    print_b_SCI?: number;
    registered_at?: string;
  }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/api/dashboard/stats");
        setStats(res.data);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  if (loading || !stats) {
    return (
      <div style={{ maxWidth: 960, margin: "0 auto", paddingLeft: 16, paddingRight: 16, paddingTop: 100, paddingBottom: 16, textAlign: "center" }}>
        <div style={{ fontSize: 18, color: "#666" }}>데이터 로딩 중...</div>
      </div>
    );
  }

  const { patterns: ps, samples: ss, delta_E: de, master, recent_patterns, recent_samples } = stats;
  const avgDeltaE = de.avg != null ? de.avg.toFixed(2) : "-";
  const minDeltaE = de.min != null ? de.min.toFixed(2) : "-";
  const maxDeltaE = de.max != null ? de.max.toFixed(2) : "-";
  const totalDE = de.distribution.under_1 + de.distribution["1_to_3"] + de.distribution["3_to_6"] + de.distribution.over_6;

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
          <div style={{ fontSize: 28, fontWeight: 700, color: "#2563eb" }}>{ps.total}</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>전체 패턴</div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
            진행 <span style={{ color: "#f59e0b", fontWeight: 600 }}>{ps.in_progress}</span> · 확정 <span style={{ color: "#10b981", fontWeight: 600 }}>{ps.confirmed}</span>
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#7c3aed" }}>{ss.total}</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>전체 샘플</div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
            확정 <span style={{ color: "#10b981", fontWeight: 600 }}>{ss.confirmed}</span> · 라운드 <span style={{ fontWeight: 600 }}>{master.rounds}</span>
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
          <div style={{ fontSize: 28, fontWeight: 700, color: "#8b5cf6" }}>{master.ink_colors}</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>마스터 배합</div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
            동판 <span style={{ fontWeight: 600 }}>{master.plates}</span> · 패드 <span style={{ fontWeight: 600 }}>{master.pads}</span> · 베이스 <span style={{ fontWeight: 600 }}>{master.base_colors}</span>
          </div>
        </div>
      </div>

      {/* ΔE 분포 */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>ΔE 분포</h2>
        {totalDE === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: "#999", fontSize: 13 }}>ΔE 데이터 없음</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "ΔE < 1 (우수)", count: de.distribution.under_1, color: "#10b981" },
              { label: "1 ≤ ΔE < 3 (양호)", count: de.distribution["1_to_3"], color: "#3b82f6" },
              { label: "3 ≤ ΔE < 6 (보통)", count: de.distribution["3_to_6"], color: "#f59e0b" },
              { label: "ΔE ≥ 6 (미흡)", count: de.distribution.over_6, color: "#ef4444" },
            ].map(item => {
              const pct = totalDE > 0 ? (item.count / totalDE) * 100 : 0;
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

      {/* 최근 패턴 */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>최근 업데이트 패턴</h2>
        {recent_patterns.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: "#999", fontSize: 13 }}>패턴 없음</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {recent_patterns.map(p => {
              const statusLabel = p.status === "confirmed" ? "✅ 확정" : p.status === "in_progress" ? "🔄 진행중" : p.status === "hold" ? "⏸ 보류" : p.status;
              return (
                <div key={p.pattern_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "#f8f9fa", borderRadius: 6, cursor: "pointer" }}
                  onClick={() => router.push(`/patterns/${p.pattern_id}`)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{p.pattern_name}</div>
                    <div style={{ fontSize: 10, color: "#999" }}>{p.color_count}도 · {statusLabel}</div>
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
        {recent_samples.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: "#999", fontSize: 13 }}>샘플 없음</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {recent_samples.map(s => {
              const deColor = s.delta_E == null ? "#999" : s.delta_E < 1 ? "#10b981" : s.delta_E < 3 ? "#3b82f6" : s.delta_E < 6 ? "#f59e0b" : "#ef4444";
              return (
                <div key={s.sample_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: s.is_confirmed ? "#f0fdf4" : "#f8f9fa", borderRadius: 6, borderLeft: s.is_confirmed ? "3px solid #10b981" : "3px solid transparent" }}>
                  {s.print_L_SCI != null && s.print_a_SCI != null && s.print_b_SCI != null && (
                    <div style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #ccc", background: labToRgb(s.print_L_SCI, s.print_a_SCI, s.print_b_SCI), flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>
                      S{s.sample_number}
                    </div>
                    <div style={{ fontSize: 10, color: "#999" }}>
                      {s.registered_at ? new Date(s.registered_at).toLocaleDateString("ko-KR") : ""}
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
