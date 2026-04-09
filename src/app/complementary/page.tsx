"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { labToRgb } from "@/lib/color";

interface InkResult {
  ink_id: number; ink_name: string; ink_type?: string; manufacturer?: string;
  ink_Lab: { L: number; a: number; b: number };
  ink_LCH: { L: number; C: number; H: number };
  delta_E_76: number; delta_E_2000: number;
}

interface SampleResult {
  sample_id: number; round_id: number; sample_number: number;
  recipe_name?: string; color_name?: string;
  print_Lab: { L: number; a: number; b: number };
  ink_items?: any[]; delta_E_76: number; delta_E_2000: number;
}

interface ComplementaryResult {
  input_Lab: { L: number; a: number; b: number };
  input_LCH: { L: number; C: number; H: number };
  method: string;
  complementary_Lab: { L: number; a: number; b: number };
  complementary_LCH: { L: number; C: number; H: number };
  recommended_inks: InkResult[];
  similar_past_samples: SampleResult[];
}

interface MethodInfo {
  method: string; name: string; description: string;
}

export default function ComplementaryPage() {
  const router = useRouter();
  const [L, setL] = useState<string>("");
  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");
  const [method, setMethod] = useState<string>("chroma_only");
  const [targetLightness, setTargetLightness] = useState<string>("");
  const [topN, setTopN] = useState<string>("5");
  const [result, setResult] = useState<ComplementaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const  [methods] = useState<MethodInfo[]>([
  { method: "chroma_only", name: "색상 반전 (명도 유지)", description: "a*, b*만 반전하고 L*은 유지합니다. 동일 밝기에서 보색을 찾습니다." },
  { method: "full", name: "완전 반전", description: "L*, a*, b* 모두 반전합니다." },
  { method: "neutral_target", name: "중성색 목표", description: "투광 후 무채색(L50,a0,b0)에 가까워지도록 보색을 계산합니다." },
  ]);


  // 3가지 방법 동시 비교
  const [compareResults, setCompareResults] = useState<ComplementaryResult[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const handleCalculate = async () => {
    if (!L || !a || !b) { alert("L*, a*, b* 값을 모두 입력하세요"); return; }
    setLoading(true);
    try {
      const payload: any = {
        L: parseFloat(L), a: parseFloat(a), b: parseFloat(b),
        method, top_n: parseInt(topN) || 5,
      };
      if (targetLightness) payload.target_lightness = parseFloat(targetLightness);
      const res = await api.post("/api/complementary/calculate", payload);
      setResult(res.data);
      setShowCompare(false);
    } catch (e: any) {
      alert("계산 실패: " + (e.response?.data?.detail || e.message));
    } finally { setLoading(false); }
  };

  const handleCompareAll = async () => {
    if (!L || !a || !b) { alert("L*, a*, b* 값을 모두 입력하세요"); return; }
    setLoading(true);
    try {
      const allMethods = ["chroma_only", "full", "neutral_target"];
      const results = await Promise.all(
        allMethods.map(m => api.post("/api/complementary/calculate", {
          L: parseFloat(L), a: parseFloat(a), b: parseFloat(b),
          method: m, top_n: parseInt(topN) || 5,
        }))
      );
      setCompareResults(results.map(r => r.data));
      setShowCompare(true);
      setResult(null);
    } catch (e: any) {
      alert("비교 실패: " + (e.response?.data?.detail || e.message));
    } finally { setLoading(false); }
  };

  const inputHasValue = L !== "" && a !== "" && b !== "";
  const previewColor = inputHasValue ? labToRgb(parseFloat(L), parseFloat(a), parseFloat(b)) : "#eee";

  const methodLabel = (m: string) => methods.find(x => x.method === m)?.name || m;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>보색 추출 알고리즘</h1>
        <button onClick={() => router.push("/")} style={{ padding: "6px 16px", background: "#6b7280", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
          ← 메인
        </button>
      </div>

      {/* 입력 섹션 */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 20, marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>투광소재 Lab 입력</h2>

        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Lab 입력 */}
          <div style={{ display: "flex", gap: 8 }}>
            <div>
              <label style={{ fontSize: 12, color: "#666" }}>L*</label>
              <input type="number" value={L} onChange={e => setL(e.target.value)}
                style={{ display: "block", width: 80, padding: 8, border: "1px solid #ddd", borderRadius: 6, fontSize: 14 }} placeholder="0~100" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666" }}>a*</label>
              <input type="number" value={a} onChange={e => setA(e.target.value)}
                style={{ display: "block", width: 80, padding: 8, border: "1px solid #ddd", borderRadius: 6, fontSize: 14 }} placeholder="-128~127" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666" }}>b*</label>
              <input type="number" value={b} onChange={e => setB(e.target.value)}
                style={{ display: "block", width: 80, padding: 8, border: "1px solid #ddd", borderRadius: 6, fontSize: 14 }} placeholder="-128~127" />
            </div>
          </div>

          {/* 미리보기 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 48, height: 48, borderRadius: 8, border: "2px solid #ccc", background: previewColor }} />
            <span style={{ fontSize: 12, color: "#999" }}>입력 컬러</span>
          </div>

          {/* 방법 선택 */}
          <div>
            <label style={{ fontSize: 12, color: "#666" }}>계산 방법</label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              style={{ display: "block", width: 200, padding: 8, border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }}>
              {methods.map(m => <option key={m.method} value={m.method}>{m.name}</option>)}
            </select>
          </div>

          {/* 옵션 */}
          <div>
            <label style={{ fontSize: 12, color: "#666" }}>명도 오버라이드</label>
            <input type="number" value={targetLightness} onChange={e => setTargetLightness(e.target.value)}
              style={{ display: "block", width: 80, padding: 8, border: "1px solid #ddd", borderRadius: 6, fontSize: 14 }} placeholder="비워두기" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#666" }}>추천 수</label>
            <input type="number" value={topN} onChange={e => setTopN(e.target.value)}
              style={{ display: "block", width: 60, padding: 8, border: "1px solid #ddd", borderRadius: 6, fontSize: 14 }} />
          </div>
        </div>

        {/* 방법 설명 */}
        <div style={{ marginTop: 10, padding: 8, background: "#f0f9ff", borderRadius: 6, fontSize: 12, color: "#1e40af" }}>
          {methods.find(m => m.method === method)?.description}
        </div>

        {/* 버튼 */}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={handleCalculate} disabled={loading}
            style={{ padding: "10px 24px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, opacity: loading ? 0.6 : 1 }}>
            {loading ? "계산 중..." : "보색 계산"}
          </button>
          <button onClick={handleCompareAll} disabled={loading}
            style={{ padding: "10px 24px", background: "#0891b2", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
            3가지 방법 비교
          </button>
        </div>
      </div>

      {/* 단일 결과 */}
      {result && !showCompare && (
        <div>
          {/* 원본 vs 보색 */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 20, marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>계산 결과 — {methodLabel(result.method)}</h2>
            <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
              {/* 원본 */}
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 80, height: 80, borderRadius: 12, border: "2px solid #ccc", background: labToRgb(result.input_Lab.L, result.input_Lab.a, result.input_Lab.b), margin: "0 auto 6px" }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>원본 (투광소재)</div>
                <div style={{ fontSize: 11, color: "#666" }}>L={result.input_Lab.L} a={result.input_Lab.a} b={result.input_Lab.b}</div>
                <div style={{ fontSize: 10, color: "#999" }}>C={result.input_LCH.C} H={result.input_LCH.H}°</div>
              </div>

              <div style={{ fontSize: 28, color: "#7c3aed", fontWeight: 700 }}>→</div>

              {/* 보색 */}
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 80, height: 80, borderRadius: 12, border: "2px solid #7c3aed", background: labToRgb(result.complementary_Lab.L, result.complementary_Lab.a, result.complementary_Lab.b), margin: "0 auto 6px" }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: "#7c3aed" }}>보색</div>
                <div style={{ fontSize: 11, color: "#666" }}>L={result.complementary_Lab.L} a={result.complementary_Lab.a} b={result.complementary_Lab.b}</div>
                <div style={{ fontSize: 10, color: "#999" }}>C={result.complementary_LCH.C} H={result.complementary_LCH.H}°</div>
              </div>

              {/* 겹침 미리보기 */}
              <div style={{ textAlign: "center" }}>
                <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 6px" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, width: 60, height: 60, borderRadius: 30, background: labToRgb(result.input_Lab.L, result.input_Lab.a, result.input_Lab.b), opacity: 0.7, border: "1px solid #ccc" }} />
                  <div style={{ position: "absolute", bottom: 0, right: 0, width: 60, height: 60, borderRadius: 30, background: labToRgb(result.complementary_Lab.L, result.complementary_Lab.a, result.complementary_Lab.b), opacity: 0.7, border: "1px solid #7c3aed" }} />
                </div>
                <div style={{ fontSize: 11, color: "#999" }}>겹침 미리보기</div>
              </div>
            </div>
          </div>

          {/* 추천 잉크 */}
          {result.recommended_inks.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 20, marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>보색에 가까운 잉크 추천</h2>
              {result.recommended_inks.map((ink, i) => (
                <div key={ink.ink_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < result.recommended_inks.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#7c3aed", width: 24 }}>#{i + 1}</span>
                  <div style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #ccc", background: labToRgb(ink.ink_Lab.L, ink.ink_Lab.a, ink.ink_Lab.b) }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{ink.ink_name}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>
                      {ink.ink_type && `${ink.ink_type} · `}{ink.manufacturer && `${ink.manufacturer} · `}
                      L={ink.ink_Lab.L} a={ink.ink_Lab.a} b={ink.ink_Lab.b}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: ink.delta_E_2000 < 3 ? "#10b981" : ink.delta_E_2000 < 6 ? "#f59e0b" : "#ef4444" }}>
                      ΔE00 = {ink.delta_E_2000}
                    </div>
                    <div style={{ fontSize: 10, color: "#999" }}>ΔE76 = {ink.delta_E_76}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 유사 과거 샘플 */}
          {result.similar_past_samples.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 20, marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>보색과 유사한 과거 인쇄 샘플</h2>
              {result.similar_past_samples.map((s, i) => (
                <div key={s.sample_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < result.similar_past_samples.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#0891b2", width: 24 }}>#{i + 1}</span>
                  <div style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #ccc", background: labToRgb(s.print_Lab.L, s.print_Lab.a, s.print_Lab.b) }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.recipe_name || `샘플 #${s.sample_id}`}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>
                      {s.color_name && `${s.color_name} · `}
                      L={s.print_Lab.L} a={s.print_Lab.a} b={s.print_Lab.b}
                      {s.ink_items && ` · 잉크 ${s.ink_items.length}종`}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: s.delta_E_2000 < 3 ? "#10b981" : s.delta_E_2000 < 6 ? "#f59e0b" : "#ef4444" }}>
                      ΔE00 = {s.delta_E_2000}
                    </div>
                    <div style={{ fontSize: 10, color: "#999" }}>ΔE76 = {s.delta_E_76}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3가지 비교 결과 */}
      {showCompare && compareResults.length === 3 && (
        <div>
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 20, marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>3가지 방법 비교</h2>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {/* 원본 */}
              <div style={{ textAlign: "center", padding: 12, background: "#f8f9fa", borderRadius: 8, minWidth: 100 }}>
                <div style={{ width: 64, height: 64, borderRadius: 10, border: "2px solid #ccc", background: labToRgb(compareResults[0].input_Lab.L, compareResults[0].input_Lab.a, compareResults[0].input_Lab.b), margin: "0 auto 6px" }} />
                <div style={{ fontSize: 12, fontWeight: 600 }}>원본</div>
                <div style={{ fontSize: 10, color: "#666" }}>L={compareResults[0].input_Lab.L}</div>
                <div style={{ fontSize: 10, color: "#666" }}>a={compareResults[0].input_Lab.a}</div>
                <div style={{ fontSize: 10, color: "#666" }}>b={compareResults[0].input_Lab.b}</div>
              </div>

              {compareResults.map((cr, idx) => (
                <div key={idx} style={{ textAlign: "center", padding: 12, background: idx === 0 ? "#f5f3ff" : idx === 1 ? "#ecfdf5" : "#fff7ed", borderRadius: 8, border: idx === 0 ? "2px solid #7c3aed" : "1px solid #e5e7eb", minWidth: 100 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 10, border: "2px solid " + (idx === 0 ? "#7c3aed" : idx === 1 ? "#10b981" : "#f59e0b"), background: labToRgb(cr.complementary_Lab.L, cr.complementary_Lab.a, cr.complementary_Lab.b), margin: "0 auto 6px" }} />
                  <div style={{ fontSize: 12, fontWeight: 600, color: idx === 0 ? "#7c3aed" : idx === 1 ? "#10b981" : "#f59e0b" }}>
                    {methodLabel(cr.method)}
                  </div>
                  <div style={{ fontSize: 10, color: "#666" }}>L={cr.complementary_Lab.L}</div>
                  <div style={{ fontSize: 10, color: "#666" }}>a={cr.complementary_Lab.a}</div>
                  <div style={{ fontSize: 10, color: "#666" }}>b={cr.complementary_Lab.b}</div>
                  <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>H={cr.complementary_LCH.H}°</div>
                </div>
              ))}
            </div>
          </div>

          {/* 각 방법별 추천 잉크 요약 */}
          {compareResults.map((cr, idx) => (
            cr.recommended_inks.length > 0 && (
              <div key={idx} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: idx === 0 ? "#7c3aed" : idx === 1 ? "#10b981" : "#f59e0b" }}>
                  {methodLabel(cr.method)} — 추천 잉크 Top {cr.recommended_inks.length}
                </h3>
                {cr.recommended_inks.map((ink, i) => (
                  <div key={ink.ink_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12 }}>
                    <span style={{ fontWeight: 700, width: 20 }}>#{i + 1}</span>
                    <div style={{ width: 20, height: 20, borderRadius: 4, border: "1px solid #ccc", background: labToRgb(ink.ink_Lab.L, ink.ink_Lab.a, ink.ink_Lab.b) }} />
                    <span style={{ flex: 1 }}>{ink.ink_name}</span>
                    <span style={{ fontWeight: 700, color: ink.delta_E_2000 < 3 ? "#10b981" : ink.delta_E_2000 < 6 ? "#f59e0b" : "#ef4444" }}>
                      ΔE00={ink.delta_E_2000}
                    </span>
                  </div>
                ))}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
