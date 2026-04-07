"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

// Lab → sRGB 변환
function labToRgb(L: number, a: number, b: number): string {
  let y = (L + 16) / 116;
  let x = a / 500 + y;
  let z = y - b / 200;
  x = x > 0.206897 ? x * x * x : (x - 16 / 116) / 7.787;
  y = y > 0.206897 ? y * y * y : (y - 16 / 116) / 7.787;
  z = z > 0.206897 ? z * z * z : (z - 16 / 116) / 7.787;
  x *= 0.95047;
  z *= 1.08883;
  let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let bVal = x * 0.0557 + y * -0.204 + z * 1.057;
  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
  bVal = bVal > 0.0031308 ? 1.055 * Math.pow(bVal, 1 / 2.4) - 0.055 : 12.92 * bVal;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return `rgb(${clamp(r)}, ${clamp(g)}, ${clamp(bVal)})`;
}

function ColorBox({ L, a, b, label }: { L: number | null; a: number | null; b: number | null; label: string }) {
  if (L === null || a === null || b === null) return null;
  const color = labToRgb(L, a, b);
  return (
    <div className="flex flex-col items-center">
      <div className="w-14 h-14 rounded-lg border border-gray-300 shadow-sm" style={{ backgroundColor: color }} title={`L:${L} a:${a} b:${b}`} />
      <span className="text-[10px] text-gray-500 mt-1">{label}</span>
    </div>
  );
}

interface GroupData { group_id: number; group_name: string; sort_order: number; }
interface ColorDetail { color_id: number; group_id: number | null; color_name: string; mode: string; customer: string | null; product: string | null; paint_shop: string | null; dev_stage: string | null; manager: string | null; status: string; target_L: number | null; target_a: number | null; target_b: number | null; }
interface RoundData { round_id: number; color_id: number; round_number: number; plate_id: number | null; pad_id: number | null; round_memo: string | null; }
interface SampleData { sample_id: number; round_id: number; sample_number: number; recipe_name: string | null; ink_items: any[] | null; ink_total_g: number | null; thinner_pct: number | null; thinner_g: number | null; hardener_pct: number | null; hardener_g: number | null; total_weight_g: number | null; base_L_SCI: number | null; base_a_SCI: number | null; base_b_SCI: number | null; print_L_SCI: number | null; print_a_SCI: number | null; print_b_SCI: number | null; delta_L: number | null; delta_a: number | null; delta_b: number | null; delta_E: number | null; trans_L_SCI: number | null; trans_a_SCI: number | null; trans_b_SCI: number | null; trans_delta_E: number | null; is_confirmed: boolean; note: string | null; }
interface InkItem { ink_name: string; weight_g: number; }
interface SampleFormData { recipe_name: string; ink_items: InkItem[]; thinner_pct: number; hardener_pct: number; base_L_SCI: number | null; base_a_SCI: number | null; base_b_SCI: number | null; print_L_SCI: number | null; print_a_SCI: number | null; print_b_SCI: number | null; note: string; }
interface ColorEditForm { color_name: string; mode: string; customer: string; product: string; paint_shop: string; dev_stage: string; manager: string; status: string; group_id: number | null; target_L: number | null; target_a: number | null; target_b: number | null; }
interface Recommendation { sample_id: number; recipe_name: string | null; ink_items: any[]; ink_total_g: number | null; thinner_pct: number | null; hardener_pct: number | null; total_weight_g: number | null; print_Lab: { L: number; a: number; b: number }; delta_E_to_target: number; delta_L: number; delta_a: number; delta_b: number; source_color: string | null; is_confirmed: boolean; }

const emptySampleForm: SampleFormData = { recipe_name: "", ink_items: [{ ink_name: "", weight_g: 0 }], thinner_pct: 0, hardener_pct: 0, base_L_SCI: null, base_a_SCI: null, base_b_SCI: null, print_L_SCI: null, print_a_SCI: null, print_b_SCI: null, note: "" };

export default function ColorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const colorId = Number(params.id);

  const [color, setColor] = useState<ColorDetail | null>(null);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [samplesByRound, setSamplesByRound] = useState<Record<number, SampleData[]>>({});
  const [openRoundIds, setOpenRoundIds] = useState<Set<number>>(new Set());
  const [showColorEdit, setShowColorEdit] = useState(false);
  const [colorEditForm, setColorEditForm] = useState<ColorEditForm | null>(null);
  const [showSampleForm, setShowSampleForm] = useState<number | null>(null);
  const [editingSampleId, setEditingSampleId] = useState<number | null>(null);
  const [sampleForm, setSampleForm] = useState<SampleFormData>({ ...emptySampleForm });

  // 추천
  const [showRecommend, setShowRecommend] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendMessage, setRecommendMessage] = useState("");

  // 분석
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => { fetchColor(); fetchRounds(); fetchGroups(); }, [colorId]);

  const fetchColor = async () => { try { const res = await api.get(`/api/colors/${colorId}`); setColor(res.data); } catch (err) { console.error("컬러 로드 실패:", err); } };
  const fetchGroups = async () => { try { const res = await api.get("/api/groups/"); setGroups(res.data); } catch (err) { console.error("그룹 로드 실패:", err); } };
  const fetchRounds = async () => {
    try {
      const res = await api.get(`/api/rounds/?color_id=${colorId}`);
      setRounds(res.data);
      const samplesMap: Record<number, SampleData[]> = {};
      for (const r of res.data) { const sRes = await api.get(`/api/samples/?round_id=${r.round_id}`); samplesMap[r.round_id] = sRes.data; }
      setSamplesByRound(samplesMap);
    } catch (err) { console.error("라운드 로드 실패:", err); }
  };

  // 추천 API
  const fetchRecommendations = async () => {
    setRecommendLoading(true);
    setRecommendMessage("");
    try {
      const res = await api.get(`/api/algorithm/recommend/${colorId}`);
      setRecommendations(res.data.recommendations);
      if (res.data.recommendations.length === 0) {
        setRecommendMessage(res.data.message || "추천 결과가 없습니다.");
      }
      setShowRecommend(true);
    } catch (err: any) {
      const msg = err.response?.data?.detail || "추천 실패";
      setRecommendMessage(msg);
      setRecommendations([]);
      setShowRecommend(true);
    }
    setRecommendLoading(false);
  };

  // 분석 API
  const fetchAnalysis = async () => {
    try {
      const res = await api.get(`/api/algorithm/analyze/${colorId}`);
      setAnalysis(res.data);
      setShowAnalysis(true);
    } catch (err) { console.error("분석 실패:", err); }
  };

  const openColorEdit = () => {
    if (!color) return;
    setColorEditForm({ color_name: color.color_name, mode: color.mode, customer: color.customer || "", product: color.product || "", paint_shop: color.paint_shop || "", dev_stage: color.dev_stage || "", manager: color.manager || "", status: color.status, group_id: color.group_id, target_L: color.target_L, target_a: color.target_a, target_b: color.target_b });
    setShowColorEdit(true);
  };

  const saveColorEdit = async () => {
    if (!colorEditForm) return;
    try { await api.put(`/api/colors/${colorId}`, { ...colorEditForm, color_name: colorEditForm.color_name.trim() }); setShowColorEdit(false); fetchColor(); } catch (err) { console.error("컬러 수정 실패:", err); }
  };

  const createRound = async () => { try { await api.post("/api/rounds/", { color_id: colorId, round_number: rounds.length + 1 }); fetchRounds(); } catch (err) { console.error("라운드 생성 실패:", err); } };
  const deleteRound = async (roundId: number) => { if (!confirm("이 라운드를 삭제하시겠습니까?")) return; try { await api.delete(`/api/rounds/${roundId}`); fetchRounds(); } catch (err) { console.error("라운드 삭제 실패:", err); } };
  const toggleRound = (roundId: number) => { setOpenRoundIds((prev) => { const next = new Set(prev); if (next.has(roundId)) next.delete(roundId); else next.add(roundId); return next; }); };

  const addInkRow = () => { setSampleForm({ ...sampleForm, ink_items: [...sampleForm.ink_items, { ink_name: "", weight_g: 0 }] }); };
  const removeInkRow = (index: number) => { const items = [...sampleForm.ink_items]; items.splice(index, 1); setSampleForm({ ...sampleForm, ink_items: items }); };
  const updateInkRow = (index: number, field: string, value: string | number) => { const items = [...sampleForm.ink_items]; items[index] = { ...items[index], [field]: value }; setSampleForm({ ...sampleForm, ink_items: items }); };

  const openNewSampleForm = (roundId: number) => { setEditingSampleId(null); setSampleForm({ ...emptySampleForm }); setShowSampleForm(roundId); if (!openRoundIds.has(roundId)) { setOpenRoundIds((prev) => new Set(prev).add(roundId)); } };
  const openEditSampleForm = (sample: SampleData) => {
    setEditingSampleId(sample.sample_id);
    setSampleForm({ recipe_name: sample.recipe_name || "", ink_items: sample.ink_items && sample.ink_items.length > 0 ? sample.ink_items.map((i: any) => ({ ink_name: i.ink_name || "", weight_g: i.weight_g || 0 })) : [{ ink_name: "", weight_g: 0 }], thinner_pct: sample.thinner_pct || 0, hardener_pct: sample.hardener_pct || 0, base_L_SCI: sample.base_L_SCI, base_a_SCI: sample.base_a_SCI, base_b_SCI: sample.base_b_SCI, print_L_SCI: sample.print_L_SCI, print_a_SCI: sample.print_a_SCI, print_b_SCI: sample.print_b_SCI, note: sample.note || "" });
    setShowSampleForm(sample.round_id);
  };

  // 추천 레시피를 샘플 폼에 적용
  const applyRecommendation = (rec: Recommendation, roundId: number) => {
    setEditingSampleId(null);
    setSampleForm({
      recipe_name: rec.recipe_name || "추천 레시피",
      ink_items: rec.ink_items && rec.ink_items.length > 0 ? rec.ink_items.map((i: any) => ({ ink_name: i.ink_name || "", weight_g: i.weight_g || 0 })) : [{ ink_name: "", weight_g: 0 }],
      thinner_pct: rec.thinner_pct || 0,
      hardener_pct: rec.hardener_pct || 0,
      base_L_SCI: null, base_a_SCI: null, base_b_SCI: null,
      print_L_SCI: null, print_a_SCI: null, print_b_SCI: null,
      note: `추천 적용 (원본 ΔE: ${rec.delta_E_to_target})`,
    });
    setShowSampleForm(roundId);
    setShowRecommend(false);
  };

  const saveSample = async (roundId: number) => {
    const payload = { round_id: roundId, sample_number: 0, recipe_name: sampleForm.recipe_name || null, ink_items: sampleForm.ink_items.filter((i) => i.ink_name.trim() !== ""), thinner_pct: sampleForm.thinner_pct || null, hardener_pct: sampleForm.hardener_pct || null, base_L_SCI: sampleForm.base_L_SCI, base_a_SCI: sampleForm.base_a_SCI, base_b_SCI: sampleForm.base_b_SCI, print_L_SCI: sampleForm.print_L_SCI, print_a_SCI: sampleForm.print_a_SCI, print_b_SCI: sampleForm.print_b_SCI, note: sampleForm.note || null };
    try {
      if (editingSampleId) { await api.put(`/api/samples/${editingSampleId}`, payload); }
      else { const samples = samplesByRound[roundId] || []; payload.sample_number = samples.length + 1; await api.post("/api/samples/", payload); }
      setShowSampleForm(null); setEditingSampleId(null); setSampleForm({ ...emptySampleForm }); fetchRounds();
    } catch (err) { console.error("샘플 저장 실패:", err); }
  };

  const deleteSample = async (sampleId: number) => { if (!confirm("이 샘플을 삭제하시겠습니까?")) return; try { await api.delete(`/api/samples/${sampleId}`); fetchRounds(); } catch (err) { console.error("샘플 삭제 실패:", err); } };
  const cancelForm = () => { setShowSampleForm(null); setEditingSampleId(null); setSampleForm({ ...emptySampleForm }); };

  const statusLabel = (s: string) => { switch (s) { case "confirmed": return "✅ 확정"; case "in_progress": return "🔄 진행중"; case "hold": return "⏸ 보류"; default: return s; } };
  const deltaColor = (v: number | null) => { if (v === null) return "text-gray-400"; if (v <= 1.0) return "text-green-600 font-bold"; if (v <= 3.0) return "text-yellow-600 font-bold"; return "text-red-600 font-bold"; };

  if (!color) return <div className="p-8 text-center text-gray-400">로딩 중...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/")} className="text-gray-500 hover:text-gray-800 text-sm">← 목록</button>
              <h1 className="text-xl font-bold text-gray-800">{color.color_name}</h1>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{color.mode === "translucency" ? "투광" : "매칭"}</span>
              <span className="text-xs">{statusLabel(color.status)}</span>
              <ColorBox L={color.target_L} a={color.target_a} b={color.target_b} label="타겟" />
            </div>
            <div className="flex gap-2">
              <button onClick={fetchRecommendations} disabled={recommendLoading} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">
                {recommendLoading ? "분석중..." : "AI 추천"}
              </button>
              <button onClick={fetchAnalysis} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-teal-700">ΔE 분석</button>
              <button onClick={openColorEdit} className="bg-gray-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-600">컬러 수정</button>
              <button onClick={createRound} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">+ 라운드</button>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 flex gap-4">
            <span>고객사: {color.customer || "-"}</span>
            <span>제품: {color.product || "-"}</span>
            <span>도료사: {color.paint_shop || "-"}</span>
            <span>단계: {color.dev_stage || "-"}</span>
            <span>담당: {color.manager || "-"}</span>
          </div>
          {color.target_L !== null && (
            <div className="mt-1 text-xs text-gray-500">타겟 Lab: ({color.target_L}, {color.target_a}, {color.target_b})</div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* 추천 결과 */}
        {showRecommend && (
          <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-purple-800">AI 레시피 추천 (유사도 기반)</h3>
              <button onClick={() => setShowRecommend(false)} className="text-gray-400 hover:text-gray-600 text-sm">닫기 ✕</button>
            </div>
            {recommendMessage && <p className="text-sm text-gray-500 mb-2">{recommendMessage}</p>}
            {recommendations.length > 0 && (
              <div className="space-y-3">
                {recommendations.map((rec, idx) => (
                  <div key={rec.sample_id} className="bg-white rounded-lg border p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-purple-600">#{idx + 1}</span>
                        <ColorBox L={rec.print_Lab.L} a={rec.print_Lab.a} b={rec.print_Lab.b} label="결과" />
                        <div>
                          <div className="text-sm font-medium">{rec.recipe_name || "레시피"}</div>
                          <div className="text-xs text-gray-500">출처: {rec.source_color || "알 수 없음"} {rec.is_confirmed && "✅"}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm ${deltaColor(rec.delta_E_to_target)}`}>ΔE = {rec.delta_E_to_target}</div>
                        <div className="text-[10px] text-gray-400">ΔL:{rec.delta_L} Δa:{rec.delta_a} Δb:{rec.delta_b}</div>
                      </div>
                    </div>
                    {rec.ink_items && rec.ink_items.length > 0 && (
                      <div className="mt-2 text-xs text-gray-600">
                        잉크: {rec.ink_items.map((i: any, j: number) => (
                          <span key={j}>{i.ink_name} {i.weight_g}g{j < rec.ink_items.length - 1 ? " + " : ""}</span>
                        ))}
                        {rec.thinner_pct ? ` | 신너 ${rec.thinner_pct}%` : ""}
                        {rec.hardener_pct ? ` | 경화제 ${rec.hardener_pct}%` : ""}
                      </div>
                    )}
                    {rounds.length > 0 && (
                      <div className="mt-2">
                        <button
                          onClick={() => applyRecommendation(rec, rounds[rounds.length - 1].round_id)}
                          className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200"
                        >
                          최신 라운드에 적용
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ΔE 분석 */}
        {showAnalysis && analysis && (
          <div className="mb-6 bg-teal-50 border border-teal-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-teal-800">ΔE 추이 분석</h3>
              <button onClick={() => setShowAnalysis(false)} className="text-gray-400 hover:text-gray-600 text-sm">닫기 ✕</button>
            </div>
            {analysis.rounds.length === 0 ? (
              <p className="text-sm text-gray-500">분석할 라운드가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {analysis.rounds.map((r: any) => (
                  <div key={r.round_id} className="bg-white rounded border p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">라운드 {r.round_number}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">샘플 {r.sample_count}건</span>
                        {r.best_delta_E !== null && (
                          <span className={`text-sm ${deltaColor(r.best_delta_E)}`}>최소 ΔE = {r.best_delta_E}</span>
                        )}
                      </div>
                    </div>
                    {r.samples.length > 0 && (
                      <div className="mt-2 flex gap-4">
                        {r.samples.map((s: any) => (
                          <div key={s.sample_id} className="text-xs text-center">
                            {s.print_Lab && <ColorBox L={s.print_Lab.L} a={s.print_Lab.a} b={s.print_Lab.b} label={`#${s.sample_number}`} />}
                            {s.delta_E !== null && <div className={`mt-1 ${deltaColor(s.delta_E)}`}>ΔE:{s.delta_E}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 컬러 수정 폼 */}
        {showColorEdit && colorEditForm && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-yellow-800 mb-3">컬러 정보 수정</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-gray-600 mb-1">컬러명 *</label><input type="text" value={colorEditForm.color_name} onChange={(e) => setColorEditForm({ ...colorEditForm, color_name: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
              <div><label className="block text-xs text-gray-600 mb-1">그룹</label><select value={colorEditForm.group_id ?? ""} onChange={(e) => setColorEditForm({ ...colorEditForm, group_id: e.target.value ? Number(e.target.value) : null })} className="w-full border rounded px-2 py-1.5 text-sm"><option value="">미분류</option>{groups.map((g) => (<option key={g.group_id} value={g.group_id}>{g.group_name}</option>))}</select></div>
              <div><label className="block text-xs text-gray-600 mb-1">모드</label><select value={colorEditForm.mode} onChange={(e) => setColorEditForm({ ...colorEditForm, mode: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm"><option value="matching">컬러매칭</option><option value="translucency">투광</option></select></div>
              <div><label className="block text-xs text-gray-600 mb-1">상태</label><select value={colorEditForm.status} onChange={(e) => setColorEditForm({ ...colorEditForm, status: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm"><option value="in_progress">진행중</option><option value="confirmed">확정</option><option value="hold">보류</option></select></div>
              <div><label className="block text-xs text-gray-600 mb-1">고객사</label><input type="text" value={colorEditForm.customer} onChange={(e) => setColorEditForm({ ...colorEditForm, customer: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
              <div><label className="block text-xs text-gray-600 mb-1">제품</label><input type="text" value={colorEditForm.product} onChange={(e) => setColorEditForm({ ...colorEditForm, product: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
              <div><label className="block text-xs text-gray-600 mb-1">도료사</label><input type="text" value={colorEditForm.paint_shop} onChange={(e) => setColorEditForm({ ...colorEditForm, paint_shop: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
              <div><label className="block text-xs text-gray-600 mb-1">개발단계</label><input type="text" value={colorEditForm.dev_stage} onChange={(e) => setColorEditForm({ ...colorEditForm, dev_stage: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
              <div><label className="block text-xs text-gray-600 mb-1">담당자</label><input type="text" value={colorEditForm.manager} onChange={(e) => setColorEditForm({ ...colorEditForm, manager: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
            </div>
            <div className="mt-3">
              <label className="text-xs text-gray-600 font-semibold block mb-1">타겟 Lab (L* a* b*)</label>
              <div className="flex gap-2 items-center">
                <input type="number" placeholder="L" value={colorEditForm.target_L ?? ""} onChange={(e) => setColorEditForm({ ...colorEditForm, target_L: e.target.value ? parseFloat(e.target.value) : null })} className="w-24 border rounded px-2 py-1 text-sm" />
                <input type="number" placeholder="a" value={colorEditForm.target_a ?? ""} onChange={(e) => setColorEditForm({ ...colorEditForm, target_a: e.target.value ? parseFloat(e.target.value) : null })} className="w-24 border rounded px-2 py-1 text-sm" />
                <input type="number" placeholder="b" value={colorEditForm.target_b ?? ""} onChange={(e) => setColorEditForm({ ...colorEditForm, target_b: e.target.value ? parseFloat(e.target.value) : null })} className="w-24 border rounded px-2 py-1 text-sm" />
                <ColorBox L={colorEditForm.target_L} a={colorEditForm.target_a} b={colorEditForm.target_b} label="미리보기" />
              </div>
            </div>
            <div className="mt-3 flex gap-2 justify-end">
              <button onClick={() => setShowColorEdit(false)} className="bg-gray-400 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-500">취소</button>
              <button onClick={saveColorEdit} className="bg-yellow-600 text-white px-3 py-1.5 rounded text-sm hover:bg-yellow-700">저장</button>
            </div>
          </div>
        )}

        {/* 라운드 */}
        {rounds.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-2">아직 라운드가 없습니다.</p>
            <p className="text-sm">&quot;+ 라운드&quot; 버튼으로 시작하세요.</p>
          </div>
        ) : (
          rounds.map((round) => {
            const samples = samplesByRound[round.round_id] || [];
            const isOpen = openRoundIds.has(round.round_id);
            return (
              <div key={round.round_id} className="mb-4">
                <div className="bg-white rounded-lg shadow-sm border px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50" onClick={() => toggleRound(round.round_id)}>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm">{isOpen ? "▼" : "▶"}</span>
                    <span className="font-semibold text-gray-800">라운드 {round.round_number}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">샘플 {samples.length}건</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); openNewSampleForm(round.round_id); }} className="text-blue-600 hover:text-blue-800 text-sm font-medium">+ 샘플</button>
                    <button onClick={(e) => { e.stopPropagation(); deleteRound(round.round_id); }} className="text-red-400 hover:text-red-600 text-sm">삭제</button>
                  </div>
                </div>

                {/* 샘플 폼 */}
                {showSampleForm === round.round_id && (
                  <div className="ml-6 mt-2 bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-green-800 mb-3">{editingSampleId ? "샘플 수정" : "새 샘플 등록"}</h3>
                    <div className="mb-3"><label className="block text-xs text-gray-600 mb-1">레시피명</label><input type="text" value={sampleForm.recipe_name} onChange={(e) => setSampleForm({ ...sampleForm, recipe_name: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1"><label className="text-xs text-gray-600 font-semibold">잉크 배합</label><button onClick={addInkRow} className="text-xs text-blue-600 hover:text-blue-800">+ 잉크 추가</button></div>
                      {sampleForm.ink_items.map((item, idx) => (
                        <div key={idx} className="flex gap-2 mb-1">
                          <input type="text" placeholder="잉크명" value={item.ink_name} onChange={(e) => updateInkRow(idx, "ink_name", e.target.value)} className="flex-1 border rounded px-2 py-1 text-sm" />
                          <input type="number" placeholder="g" value={item.weight_g || ""} onChange={(e) => updateInkRow(idx, "weight_g", parseFloat(e.target.value) || 0)} className="w-20 border rounded px-2 py-1 text-sm" />
                          {sampleForm.ink_items.length > 1 && <button onClick={() => removeInkRow(idx)} className="text-red-400 text-xs">✕</button>}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div><label className="block text-xs text-gray-600 mb-1">신너 %</label><input type="number" value={sampleForm.thinner_pct || ""} onChange={(e) => setSampleForm({ ...sampleForm, thinner_pct: parseFloat(e.target.value) || 0 })} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
                      <div><label className="block text-xs text-gray-600 mb-1">경화제 %</label><input type="number" value={sampleForm.hardener_pct || ""} onChange={(e) => setSampleForm({ ...sampleForm, hardener_pct: parseFloat(e.target.value) || 0 })} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
                    </div>
                    <div className="mb-3">
                      <label className="text-xs text-gray-600 font-semibold block mb-1">베이스 측정 (L* a* b*)</label>
                      <div className="flex gap-2 items-center">
                        <input type="number" placeholder="L" value={sampleForm.base_L_SCI ?? ""} onChange={(e) => setSampleForm({ ...sampleForm, base_L_SCI: e.target.value ? parseFloat(e.target.value) : null })} className="w-1/3 border rounded px-2 py-1 text-sm" />
                        <input type="number" placeholder="a" value={sampleForm.base_a_SCI ?? ""} onChange={(e) => setSampleForm({ ...sampleForm, base_a_SCI: e.target.value ? parseFloat(e.target.value) : null })} className="w-1/3 border rounded px-2 py-1 text-sm" />
                        <input type="number" placeholder="b" value={sampleForm.base_b_SCI ?? ""} onChange={(e) => setSampleForm({ ...sampleForm, base_b_SCI: e.target.value ? parseFloat(e.target.value) : null })} className="w-1/3 border rounded px-2 py-1 text-sm" />
                        <ColorBox L={sampleForm.base_L_SCI} a={sampleForm.base_a_SCI} b={sampleForm.base_b_SCI} label="베이스" />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="text-xs text-gray-600 font-semibold block mb-1">인쇄 측정 (L* a* b*)</label>
                      <div className="flex gap-2 items-center">
                        <input type="number" placeholder="L" value={sampleForm.print_L_SCI ?? ""} onChange={(e) => setSampleForm({ ...sampleForm, print_L_SCI: e.target.value ? parseFloat(e.target.value) : null })} className="w-1/3 border rounded px-2 py-1 text-sm" />
                        <input type="number" placeholder="a" value={sampleForm.print_a_SCI ?? ""} onChange={(e) => setSampleForm({ ...sampleForm, print_a_SCI: e.target.value ? parseFloat(e.target.value) : null })} className="w-1/3 border rounded px-2 py-1 text-sm" />
                        <input type="number" placeholder="b" value={sampleForm.print_b_SCI ?? ""} onChange={(e) => setSampleForm({ ...sampleForm, print_b_SCI: e.target.value ? parseFloat(e.target.value) : null })} className="w-1/3 border rounded px-2 py-1 text-sm" />
                        <ColorBox L={sampleForm.print_L_SCI} a={sampleForm.print_a_SCI} b={sampleForm.print_b_SCI} label="인쇄" />
                      </div>
                    </div>
                    <div className="mb-3"><label className="block text-xs text-gray-600 mb-1">메모</label><input type="text" value={sampleForm.note} onChange={(e) => setSampleForm({ ...sampleForm, note: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={cancelForm} className="bg-gray-400 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-500">취소</button>
                      <button onClick={() => saveSample(round.round_id)} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">{editingSampleId ? "수정 완료" : "등록"}</button>
                    </div>
                  </div>
                )}

                {/* 샘플 목록 */}
                {isOpen && (
                  <div className="ml-6 mt-2 space-y-2">
                    {samples.length === 0 && showSampleForm !== round.round_id ? (
                      <p className="text-sm text-gray-400 py-2">등록된 샘플이 없습니다.</p>
                    ) : (
                      samples.map((sample) => (
                        <div key={sample.sample_id} className="bg-white rounded-lg border px-4 py-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800 text-sm">샘플 #{sample.sample_number}</span>
                              {sample.recipe_name && <span className="text-xs text-gray-500">{sample.recipe_name}</span>}
                              {sample.is_confirmed && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">확정</span>}
                              <ColorBox L={sample.base_L_SCI} a={sample.base_a_SCI} b={sample.base_b_SCI} label="베이스" />
                              <ColorBox L={sample.print_L_SCI} a={sample.print_a_SCI} b={sample.print_b_SCI} label="인쇄" />
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => openEditSampleForm(sample)} className="text-blue-500 hover:text-blue-700 text-xs">수정</button>
                              <button onClick={() => deleteSample(sample.sample_id)} className="text-red-400 hover:text-red-600 text-xs">삭제</button>
                            </div>
                          </div>
                          {sample.ink_items && sample.ink_items.length > 0 && (
                            <div className="mt-2 text-xs text-gray-600">
                              <span className="font-semibold">잉크:</span>{" "}
                              {sample.ink_items.map((i: any, idx: number) => (<span key={idx}>{i.ink_name} {i.weight_g}g{idx < sample.ink_items!.length - 1 ? " + " : ""}</span>))}
                              {sample.ink_total_g && <span className="ml-2 text-gray-400">(합계: {sample.ink_total_g}g / 총: {sample.total_weight_g}g)</span>}
                            </div>
                          )}
                          {sample.print_L_SCI !== null && (
                            <div className="mt-2 flex gap-4 text-xs">
                              <span className="text-gray-500">인쇄 Lab: ({sample.print_L_SCI}, {sample.print_a_SCI}, {sample.print_b_SCI})</span>
                              {sample.delta_E !== null && <span className={deltaColor(sample.delta_E)}>ΔE = {sample.delta_E}</span>}
                            </div>
                          )}
                          {sample.note && <div className="mt-1 text-xs text-gray-400">메모: {sample.note}</div>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
