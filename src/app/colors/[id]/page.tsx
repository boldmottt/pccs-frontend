"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { labToRgb, deltaE2000 } from "@/lib/color";

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

/** 분광기 출력 "L a b" 또는 "L\ta\tb" 또는 "L,a,b" 파싱 */
function parseLabFromClipboard(text: string): [number, number, number] | null {
  const parts = text.trim().split(/[\s,\t]+/);
  if (parts.length >= 3) {
    const nums = parts.slice(0, 3).map(Number);
    if (nums.every(n => !isNaN(n) && isFinite(n))) return nums as [number, number, number];
  }
  return null;
}

interface GroupData { group_id: number; group_name: string; sort_order: number; }
interface ColorDetail { color_id: number; group_id: number | null; color_name: string; mode: string; customer: string | null; product: string | null; paint_shop: string | null; dev_stage: string | null; manager: string | null; status: string; target_L: number | null; target_a: number | null; target_b: number | null; }
interface RoundData { round_id: number; color_id: number; round_number: number; plate_id: number | null; pad_id: number | null; round_memo: string | null; }
interface SampleData { sample_id: number; round_id: number; sample_number: number; recipe_name: string | null; ink_items: any[] | null; ink_total_g: number | null; thinner_pct: number | null; thinner_g: number | null; hardener_pct: number | null; hardener_g: number | null; total_weight_g: number | null; base_L_SCI: number | null; base_a_SCI: number | null; base_b_SCI: number | null; print_L_SCI: number | null; print_a_SCI: number | null; print_b_SCI: number | null; delta_L: number | null; delta_a: number | null; delta_b: number | null; delta_E: number | null; trans_L_SCI: number | null; trans_a_SCI: number | null; trans_b_SCI: number | null; trans_delta_E: number | null; is_confirmed: boolean; note: string | null; }
interface InkItem { ink_name: string; weight_g: number; }
interface SampleFormData { recipe_name: string; ink_items: InkItem[]; thinner_pct: number; hardener_pct: number; base_L_SCI: number | null; base_a_SCI: number | null; base_b_SCI: number | null; print_L_SCI: number | null; print_a_SCI: number | null; print_b_SCI: number | null; note: string; }
interface ColorEditForm { color_name: string; mode: string; customer: string; product: string; paint_shop: string; dev_stage: string; manager: string; status: string; group_id: number | null; target_L: number | null; target_a: number | null; target_b: number | null; }
interface Recommendation { sample_id: number; recipe_name: string | null; ink_items: any[]; ink_total_g: number | null; thinner_pct: number | null; hardener_pct: number | null; total_weight_g: number | null; print_Lab: { L: number; a: number; b: number }; delta_E_to_target: number; delta_L: number; delta_a: number; delta_b: number; source_color: string | null; is_confirmed: boolean; }

// 보색 관련 타입
interface CompInkResult { ink_id: number; ink_name: string; ink_type?: string; manufacturer?: string; ink_Lab: { L: number; a: number; b: number }; delta_E_76: number; delta_E_2000: number; }
interface CompSampleResult { sample_id: number; round_id: number; sample_number: number; recipe_name?: string; color_name?: string; print_Lab: { L: number; a: number; b: number }; ink_items?: any[]; delta_E_76: number; delta_E_2000: number; }
interface ComplementaryResult { input_Lab: { L: number; a: number; b: number }; input_LCH: { L: number; C: number; H: number }; method: string; complementary_Lab: { L: number; a: number; b: number }; complementary_LCH: { L: number; C: number; H: number }; recommended_inks: CompInkResult[]; similar_past_samples: CompSampleResult[]; }

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

  // 테이블 뷰 토글
  const [tableViewRounds, setTableViewRounds] = useState<Set<number>>(new Set());
  // 복제 원본 표시용
  const [duplicatedFrom, setDuplicatedFrom] = useState<string | null>(null);

  // 추천
  const [showRecommend, setShowRecommend] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendMessage, setRecommendMessage] = useState("");

  // 분석
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  // 보색
  const [showComplementary, setShowComplementary] = useState(false);
  const [compResult, setCompResult] = useState<ComplementaryResult | null>(null);
  const [compMethod, setCompMethod] = useState("chroma_only");
  const [compLoading, setCompLoading] = useState(false);

  // 잉크 자동완성
  const [inkSearchResults, setInkSearchResults] = useState<any[]>([]);
  const [activeInkIdx, setActiveInkIdx] = useState<number | null>(null);
  const inkSearchTimer = useRef<NodeJS.Timeout | null>(null);
  const inkDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchColor(); fetchRounds(); fetchGroups(); }, [colorId]);

  // 타겟 Lab 변경 시 자동 보색 계산
  useEffect(() => {
    if (color && color.target_L !== null && color.target_a !== null && color.target_b !== null) {
      fetchComplementary(color.target_L, color.target_a, color.target_b, compMethod);
    } else {
      setCompResult(null);
    }
  }, [color?.target_L, color?.target_a, color?.target_b, compMethod]);

  const fetchColor = async () => { try { const res = await api.get(`/api/colors/${colorId}`); setColor(res.data); } catch (err) { console.error("컬러 로드 실패:", err); } };
  const fetchGroups = async () => { try { const res = await api.get("/api/groups/"); setGroups(res.data); } catch (err) { console.error("그룹 로드 실패:", err); } };
  const fetchRounds = async () => {
    try {
      const res = await api.get(`/api/rounds/?color_id=${colorId}`);
      setRounds(res.data);
      const sampleResponses = await Promise.all(
        res.data.map((r: RoundData) => api.get(`/api/samples/?round_id=${r.round_id}`))
      );
      const samplesMap: Record<number, SampleData[]> = {};
      res.data.forEach((r: RoundData, i: number) => { samplesMap[r.round_id] = sampleResponses[i].data; });
      setSamplesByRound(samplesMap);
    } catch (err) { console.error("라운드 로드 실패:", err); }
  };

  // 보색 계산 API
  const fetchComplementary = async (L: number, a: number, b: number, method: string) => {
    setCompLoading(true);
    try {
      const res = await api.post("/api/complementary/calculate", { L, a, b, method, top_n: 5 });
      setCompResult(res.data);
    } catch (err) { console.error("보색 계산 실패:", err); setCompResult(null); }
    setCompLoading(false);
  };

  // 추천 API
  const fetchRecommendations = async () => {
    setRecommendLoading(true);
    setRecommendMessage("");
    try {
      const res = await api.get(`/api/algorithm/recommend/${colorId}`);
      setRecommendations(res.data.recommendations);
      if (res.data.recommendations.length === 0) { setRecommendMessage(res.data.message || "추천 결과가 없습니다."); }
      setShowRecommend(true);
    } catch (err: any) {
      const msg = err.response?.data?.detail || "추천 실패";
      setRecommendMessage(msg); setRecommendations([]); setShowRecommend(true);
    }
    setRecommendLoading(false);
  };

  // 분석 API
  const fetchAnalysis = async () => {
    try { const res = await api.get(`/api/algorithm/analyze/${colorId}`); setAnalysis(res.data); setShowAnalysis(true); }
    catch (err) { console.error("분석 실패:", err); }
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
  const updateInkRow = (index: number, field: string, value: string | number) => {
    const items = [...sampleForm.ink_items];
    items[index] = { ...items[index], [field]: value };
    setSampleForm({ ...sampleForm, ink_items: items });

    // 잉크명 입력 시 자동완성 검색
    if (field === "ink_name" && typeof value === "string") {
      setActiveInkIdx(index);
      if (inkSearchTimer.current) clearTimeout(inkSearchTimer.current);
      if (value.trim().length > 0) {
        inkSearchTimer.current = setTimeout(async () => {
          try {
            const res = await api.get(`/api/search/inks?q=${encodeURIComponent(value)}`);
            setInkSearchResults(res.data);
          } catch (err) { setInkSearchResults([]); }
        }, 200);
      } else {
        setInkSearchResults([]);
      }
    }
  };

  const selectInk = (index: number, ink: any) => {
    const items = [...sampleForm.ink_items];
    items[index] = { ...items[index], ink_name: ink.ink_name };
    setSampleForm({ ...sampleForm, ink_items: items });
    setInkSearchResults([]);
    setActiveInkIdx(null);
  };

  const openNewSampleForm = (roundId: number) => { setEditingSampleId(null); setDuplicatedFrom(null); setSampleForm({ ...emptySampleForm }); setShowSampleForm(roundId); if (!openRoundIds.has(roundId)) { setOpenRoundIds((prev) => new Set(prev).add(roundId)); } };
  const openEditSampleForm = (sample: SampleData) => {
    setEditingSampleId(sample.sample_id);
    setDuplicatedFrom(null);
    setSampleForm({ recipe_name: sample.recipe_name || "", ink_items: sample.ink_items && sample.ink_items.length > 0 ? sample.ink_items.map((i: any) => ({ ink_name: i.ink_name || "", weight_g: i.weight_g || 0 })) : [{ ink_name: "", weight_g: 0 }], thinner_pct: sample.thinner_pct || 0, hardener_pct: sample.hardener_pct || 0, base_L_SCI: sample.base_L_SCI, base_a_SCI: sample.base_a_SCI, base_b_SCI: sample.base_b_SCI, print_L_SCI: sample.print_L_SCI, print_a_SCI: sample.print_a_SCI, print_b_SCI: sample.print_b_SCI, note: sample.note || "" });
    setShowSampleForm(sample.round_id);
  };

  const applyRecommendation = (rec: Recommendation, roundId: number) => {
    setEditingSampleId(null);
    setDuplicatedFrom(null);
    setSampleForm({ recipe_name: rec.recipe_name || "추천 레시피", ink_items: rec.ink_items && rec.ink_items.length > 0 ? rec.ink_items.map((i: any) => ({ ink_name: i.ink_name || "", weight_g: i.weight_g || 0 })) : [{ ink_name: "", weight_g: 0 }], thinner_pct: rec.thinner_pct || 0, hardener_pct: rec.hardener_pct || 0, base_L_SCI: null, base_a_SCI: null, base_b_SCI: null, print_L_SCI: null, print_a_SCI: null, print_b_SCI: null, note: `추천 적용 (원본 ΔE: ${rec.delta_E_to_target})` });
    setShowSampleForm(roundId); setShowRecommend(false);
  };

  const saveSample = async (roundId: number) => {
    const payload = { round_id: roundId, sample_number: 0, recipe_name: sampleForm.recipe_name || null, ink_items: sampleForm.ink_items.filter((i) => i.ink_name.trim() !== ""), thinner_pct: sampleForm.thinner_pct || null, hardener_pct: sampleForm.hardener_pct || null, base_L_SCI: sampleForm.base_L_SCI, base_a_SCI: sampleForm.base_a_SCI, base_b_SCI: sampleForm.base_b_SCI, print_L_SCI: sampleForm.print_L_SCI, print_a_SCI: sampleForm.print_a_SCI, print_b_SCI: sampleForm.print_b_SCI, note: sampleForm.note || null };
    try {
      if (editingSampleId) { await api.put(`/api/samples/${editingSampleId}`, payload); }
      else { const samples = samplesByRound[roundId] || []; payload.sample_number = samples.length + 1; await api.post("/api/samples/", payload); }
      setShowSampleForm(null); setEditingSampleId(null); setDuplicatedFrom(null); setSampleForm({ ...emptySampleForm }); fetchRounds();
    } catch (err) { console.error("샘플 저장 실패:", err); }
  };

  const deleteSample = async (sampleId: number) => { if (!confirm("이 샘플을 삭제하시겠습니까?")) return; try { await api.delete(`/api/samples/${sampleId}`); fetchRounds(); } catch (err) { console.error("샘플 삭제 실패:", err); } };
  const cancelForm = () => { setShowSampleForm(null); setEditingSampleId(null); setDuplicatedFrom(null); setSampleForm({ ...emptySampleForm }); };

  const statusLabel = (s: string) => { switch (s) { case "confirmed": return "✅ 확정"; case "in_progress": return "🔄 진행중"; case "hold": return "⏸ 보류"; default: return s; } };
  const deltaColor = (v: number | null) => { if (v === null) return "text-gray-400"; if (v <= 1.0) return "text-green-600 font-bold"; if (v <= 3.0) return "text-yellow-600 font-bold"; return "text-red-600 font-bold"; };
  const deltaColorHex = (v: number | null): string => { if (v === null) return "#9ca3af"; if (v <= 1.0) return "#16a34a"; if (v <= 3.0) return "#ca8a04"; return "#dc2626"; };
  const methodLabel = (m: string) => m === "chroma_only" ? "색상 반전 (명도 유지)" : m === "full" ? "완전 반전" : "중성색 목표";

  // ===== 새 기능: 샘플 복제 =====
  const duplicateSample = (sample: SampleData, roundId: number) => {
    setEditingSampleId(null);
    setDuplicatedFrom(`S#${sample.sample_number} ${sample.recipe_name || ""}`);
    setSampleForm({
      recipe_name: sample.recipe_name || "",
      ink_items: sample.ink_items && sample.ink_items.length > 0
        ? sample.ink_items.map((i: any) => ({ ink_name: i.ink_name || "", weight_g: i.weight_g || 0 }))
        : [{ ink_name: "", weight_g: 0 }],
      thinner_pct: sample.thinner_pct || 0,
      hardener_pct: sample.hardener_pct || 0,
      base_L_SCI: sample.base_L_SCI,
      base_a_SCI: sample.base_a_SCI,
      base_b_SCI: sample.base_b_SCI,
      print_L_SCI: null,  // 새로 측정
      print_a_SCI: null,
      print_b_SCI: null,
      note: "",
    });
    setShowSampleForm(roundId);
    if (!openRoundIds.has(roundId)) {
      setOpenRoundIds(prev => new Set(prev).add(roundId));
    }
  };

  // 이전 샘플 기반 신규 (라운드 내 또는 전체에서 마지막 샘플)
  const openNewFromPrevious = (roundId: number) => {
    const roundSamples = samplesByRound[roundId] || [];
    let lastSample: SampleData | null = null;
    if (roundSamples.length > 0) {
      lastSample = roundSamples[roundSamples.length - 1];
    } else {
      // 다른 라운드의 마지막 샘플
      for (let i = rounds.length - 1; i >= 0; i--) {
        const s = samplesByRound[rounds[i].round_id] || [];
        if (s.length > 0) { lastSample = s[s.length - 1]; break; }
      }
    }
    if (lastSample) {
      duplicateSample(lastSample, roundId);
    } else {
      openNewSampleForm(roundId);
    }
  };

  // ===== 새 기능: Lab 붙여넣기 =====
  const handleBasePaste = (e: React.ClipboardEvent) => {
    const parsed = parseLabFromClipboard(e.clipboardData.getData("text"));
    if (parsed) {
      e.preventDefault();
      setSampleForm(prev => ({ ...prev, base_L_SCI: parsed[0], base_a_SCI: parsed[1], base_b_SCI: parsed[2] }));
    }
  };
  const handlePrintPaste = (e: React.ClipboardEvent) => {
    const parsed = parseLabFromClipboard(e.clipboardData.getData("text"));
    if (parsed) {
      e.preventDefault();
      setSampleForm(prev => ({ ...prev, print_L_SCI: parsed[0], print_a_SCI: parsed[1], print_b_SCI: parsed[2] }));
    }
  };
  const handleTargetPaste = (e: React.ClipboardEvent) => {
    const parsed = parseLabFromClipboard(e.clipboardData.getData("text"));
    if (parsed) {
      e.preventDefault();
      if (colorEditForm) {
        setColorEditForm({ ...colorEditForm, target_L: parsed[0], target_a: parsed[1], target_b: parsed[2] });
      }
    }
  };

  // 테이블/카드 뷰 토글
  const toggleTableView = (roundId: number) => {
    setTableViewRounds(prev => {
      const next = new Set(prev);
      if (next.has(roundId)) next.delete(roundId);
      else next.add(roundId);
      return next;
    });
  };

  // ===== 계산된 값들 =====
  // 전체 샘플 (모든 라운드)
  const allSamplesFlat = rounds.flatMap(r =>
    (samplesByRound[r.round_id] || []).map(s => ({ ...s, round_number: r.round_number }))
  );

  // 최신 인쇄 측정 샘플
  const latestPrintSample = [...allSamplesFlat]
    .filter(s => s.print_L_SCI !== null)
    .sort((a, b) => b.sample_id - a.sample_id)[0] || null;

  // ΔE 추이 (시간순)
  const deltaETrend = allSamplesFlat
    .filter(s => s.delta_E !== null)
    .sort((a, b) => a.sample_id - b.sample_id)
    .map(s => ({ id: s.sample_id, num: s.sample_number, round: s.round_number, deltaE: s.delta_E!, dL: s.delta_L, da: s.delta_a, db: s.delta_b }));

  // 최소 ΔE (전체 best)
  const bestOverall = deltaETrend.length > 0
    ? deltaETrend.reduce((a, b) => a.deltaE < b.deltaE ? a : b) : null;

  // 이 컬러에서 사용한 잉크 목록 (빈도순)
  const recentlyUsedInks: string[] = (() => {
    const inkMap = new Map<string, number>();
    allSamplesFlat.forEach(s => {
      if (s.ink_items) {
        s.ink_items.forEach((item: any) => {
          if (item.ink_name) inkMap.set(item.ink_name, (inkMap.get(item.ink_name) || 0) + 1);
        });
      }
    });
    return [...inkMap.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  })();

  // 실시간 ΔE 미리 계산
  const previewDeltaE = (() => {
    if (!color || color.target_L === null || color.target_a === null || color.target_b === null) return null;
    if (sampleForm.print_L_SCI === null || sampleForm.print_a_SCI === null || sampleForm.print_b_SCI === null) return null;
    return deltaE2000(color.target_L, color.target_a, color.target_b, sampleForm.print_L_SCI, sampleForm.print_a_SCI, sampleForm.print_b_SCI);
  })();

  // 조정 가이드 텍스트
  const getAdjustGuide = (dL: number | null, da: number | null, db: number | null): string[] => {
    const guides: string[] = [];
    if (dL === null || da === null || db === null) return guides;
    const abs = (v: number) => Math.abs(v);
    if (abs(dL) >= 0.5) guides.push(dL > 0 ? `L +${dL.toFixed(1)} (밝음→어둡게)` : `L ${dL.toFixed(1)} (어두움→밝게)`);
    if (abs(da) >= 0.3) guides.push(da > 0 ? `a +${da.toFixed(1)} (적→녹 방향)` : `a ${da.toFixed(1)} (녹→적 방향)`);
    if (abs(db) >= 0.3) guides.push(db > 0 ? `b +${db.toFixed(1)} (황→청 방향)` : `b ${db.toFixed(1)} (청→황 방향)`);
    return guides;
  };

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
              {/* 보색 미니 프리뷰 */}
              {compResult && (
                <ColorBox L={compResult.complementary_Lab.L} a={compResult.complementary_Lab.a} b={compResult.complementary_Lab.b} label="보색" />
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowComplementary(!showComplementary)} className={`px-4 py-2 rounded-lg text-sm ${showComplementary ? "bg-purple-700 text-white" : "bg-purple-600 text-white hover:bg-purple-700"}`}>
                {compLoading ? "계산중..." : "보색 분석"}
              </button>
              <button onClick={fetchRecommendations} disabled={recommendLoading} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
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

        {/* ===== 타겟 vs 현재 상시 비교 위젯 ===== */}
        {color.target_L !== null && color.target_a !== null && color.target_b !== null && (
          <div className="mb-6 bg-white rounded-lg border shadow-sm p-4">
            <div className="flex items-center gap-6 flex-wrap">
              {/* 타겟 스와치 */}
              <div className="text-center flex-shrink-0">
                <div className="w-16 h-16 rounded-lg border-2 border-gray-300 shadow-sm mx-auto" style={{ backgroundColor: labToRgb(color.target_L!, color.target_a!, color.target_b!) }} />
                <div className="text-xs font-medium mt-1">타겟</div>
                <div className="text-[10px] text-gray-500">L:{color.target_L} a:{color.target_a} b:{color.target_b}</div>
              </div>

              <div className="text-2xl text-gray-300 flex-shrink-0">→</div>

              {/* 최신 인쇄 스와치 */}
              {latestPrintSample ? (
                <div className="text-center flex-shrink-0">
                  <div className="w-16 h-16 rounded-lg border-2 shadow-sm mx-auto" style={{
                    backgroundColor: labToRgb(latestPrintSample.print_L_SCI!, latestPrintSample.print_a_SCI!, latestPrintSample.print_b_SCI!),
                    borderColor: deltaColorHex(latestPrintSample.delta_E)
                  }} />
                  <div className="text-xs font-medium mt-1">최신 S#{latestPrintSample.sample_number}</div>
                  <div className="text-[10px] text-gray-500">L:{latestPrintSample.print_L_SCI} a:{latestPrintSample.print_a_SCI} b:{latestPrintSample.print_b_SCI}</div>
                </div>
              ) : (
                <div className="text-center text-gray-400 text-sm flex-shrink-0">측정값 없음</div>
              )}

              {/* ΔE + 방향 */}
              {latestPrintSample?.delta_E !== null && latestPrintSample && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold" style={{ color: deltaColorHex(latestPrintSample.delta_E) }}>
                      ΔE = {latestPrintSample.delta_E}
                    </span>
                    {latestPrintSample.delta_E !== null && latestPrintSample.delta_E <= 1.0 && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">우수</span>}
                    {latestPrintSample.delta_E !== null && latestPrintSample.delta_E > 1.0 && latestPrintSample.delta_E <= 3.0 && <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">양호</span>}
                    {latestPrintSample.delta_E !== null && latestPrintSample.delta_E > 3.0 && <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">조정 필요</span>}
                  </div>
                  <div className="mt-1.5 flex gap-3 text-xs">
                    <span className={latestPrintSample.delta_L !== null && Math.abs(latestPrintSample.delta_L) >= 0.5 ? "font-semibold text-gray-800" : "text-gray-500"}>
                      ΔL: {latestPrintSample.delta_L !== null ? (latestPrintSample.delta_L > 0 ? "+" : "") + latestPrintSample.delta_L.toFixed(2) : "-"} {latestPrintSample.delta_L !== null && (latestPrintSample.delta_L > 0 ? "↑" : latestPrintSample.delta_L < 0 ? "↓" : "")}
                    </span>
                    <span className={latestPrintSample.delta_a !== null && Math.abs(latestPrintSample.delta_a) >= 0.3 ? "font-semibold text-gray-800" : "text-gray-500"}>
                      Δa: {latestPrintSample.delta_a !== null ? (latestPrintSample.delta_a > 0 ? "+" : "") + latestPrintSample.delta_a.toFixed(2) : "-"} {latestPrintSample.delta_a !== null && (latestPrintSample.delta_a > 0 ? "↑" : latestPrintSample.delta_a < 0 ? "↓" : "")}
                    </span>
                    <span className={latestPrintSample.delta_b !== null && Math.abs(latestPrintSample.delta_b) >= 0.3 ? "font-semibold text-gray-800" : "text-gray-500"}>
                      Δb: {latestPrintSample.delta_b !== null ? (latestPrintSample.delta_b > 0 ? "+" : "") + latestPrintSample.delta_b.toFixed(2) : "-"} {latestPrintSample.delta_b !== null && (latestPrintSample.delta_b > 0 ? "↑" : latestPrintSample.delta_b < 0 ? "↓" : "")}
                    </span>
                  </div>
                  {/* 조정 가이드 */}
                  {getAdjustGuide(latestPrintSample.delta_L, latestPrintSample.delta_a, latestPrintSample.delta_b).length > 0 && (
                    <div className="mt-1.5 text-[11px] text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      조정: {getAdjustGuide(latestPrintSample.delta_L, latestPrintSample.delta_a, latestPrintSample.delta_b).join(" / ")}
                    </div>
                  )}
                </div>
              )}

              {/* ΔE 추이 */}
              {deltaETrend.length > 1 && (
                <div className="text-right flex-shrink-0 min-w-[140px]">
                  <div className="text-xs text-gray-500 mb-1">ΔE 추이 ({deltaETrend.length}건)</div>
                  <div className="flex items-center gap-1 justify-end flex-wrap">
                    {deltaETrend.slice(-5).map((t, i, arr) => (
                      <span key={t.id} className="text-xs">
                        <span className="font-mono" style={{ color: deltaColorHex(t.deltaE) }}>{t.deltaE.toFixed(1)}</span>
                        {i < arr.length - 1 && <span className="text-gray-300 mx-0.5">→</span>}
                      </span>
                    ))}
                  </div>
                  {deltaETrend.length >= 2 && (
                    <div className={`text-xs mt-1 ${
                      deltaETrend[deltaETrend.length - 1].deltaE < deltaETrend[0].deltaE ? "text-green-600" : "text-red-500"
                    }`}>
                      {deltaETrend[deltaETrend.length - 1].deltaE < deltaETrend[0].deltaE ? "📉 개선 중" : "📈 주의"}
                      {bestOverall && <span className="text-gray-400 ml-1">(최소: {bestOverall.deltaE})</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== 보색 분석 패널 ===== */}
        {showComplementary && (
          <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-purple-800">보색 분석 (타겟 Lab 기반)</h3>
              <button onClick={() => setShowComplementary(false)} className="text-gray-400 hover:text-gray-600 text-sm">닫기 ✕</button>
            </div>

            {color.target_L === null ? (
              <p className="text-sm text-gray-500">타겟 Lab 값을 먼저 설정하세요. (컬러 수정 → 타겟 Lab 입력)</p>
            ) : (
              <>
                {/* 방법 선택 */}
                <div className="flex gap-2 mb-4">
                  {["chroma_only", "full", "neutral_target"].map(m => (
                    <button key={m} onClick={() => setCompMethod(m)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${compMethod === m ? "bg-purple-600 text-white" : "bg-white border border-purple-300 text-purple-700 hover:bg-purple-100"}`}>
                      {methodLabel(m)}
                    </button>
                  ))}
                </div>

                {compResult && (
                  <>
                    {/* 원본 → 보색 시각화 */}
                    <div className="flex items-center gap-6 mb-5">
                      <div className="text-center">
                        <div className="w-20 h-20 rounded-xl border-2 border-gray-300 shadow-sm mx-auto mb-1" style={{ backgroundColor: labToRgb(compResult.input_Lab.L, compResult.input_Lab.a, compResult.input_Lab.b) }} />
                        <div className="text-xs font-semibold">타겟 (원본)</div>
                        <div className="text-[10px] text-gray-500">L={compResult.input_Lab.L} a={compResult.input_Lab.a} b={compResult.input_Lab.b}</div>
                        <div className="text-[10px] text-gray-400">H={compResult.input_LCH.H}° C={compResult.input_LCH.C}</div>
                      </div>

                      <div className="text-2xl text-purple-500 font-bold">→</div>

                      <div className="text-center">
                        <div className="w-20 h-20 rounded-xl border-2 border-purple-500 shadow-sm mx-auto mb-1" style={{ backgroundColor: labToRgb(compResult.complementary_Lab.L, compResult.complementary_Lab.a, compResult.complementary_Lab.b) }} />
                        <div className="text-xs font-semibold text-purple-700">보색</div>
                        <div className="text-[10px] text-gray-500">L={compResult.complementary_Lab.L} a={compResult.complementary_Lab.a} b={compResult.complementary_Lab.b}</div>
                        <div className="text-[10px] text-gray-400">H={compResult.complementary_LCH.H}° C={compResult.complementary_LCH.C}</div>
                      </div>

                      {/* 겹침 미리보기 */}
                      <div className="text-center">
                        <div className="relative w-20 h-20 mx-auto mb-1">
                          <div className="absolute top-0 left-0 w-14 h-14 rounded-full opacity-70 border border-gray-300" style={{ backgroundColor: labToRgb(compResult.input_Lab.L, compResult.input_Lab.a, compResult.input_Lab.b) }} />
                          <div className="absolute bottom-0 right-0 w-14 h-14 rounded-full opacity-70 border border-purple-400" style={{ backgroundColor: labToRgb(compResult.complementary_Lab.L, compResult.complementary_Lab.a, compResult.complementary_Lab.b) }} />
                        </div>
                        <div className="text-[10px] text-gray-400">겹침 미리보기</div>
                      </div>

                      {/* 방법 설명 */}
                      <div className="flex-1 bg-white rounded-lg border p-3 text-xs text-gray-600">
                        <div className="font-semibold text-purple-700 mb-1">{methodLabel(compMethod)}</div>
                        {compMethod === "chroma_only" && "a*, b*만 반전하고 L*(명도)은 유지합니다. 동일 밝기에서 보색 잉크를 찾을 때 사용합니다."}
                        {compMethod === "full" && "L*, a*, b* 모두 반전합니다. 밝은 소재→어두운 보색, 어두운 소재→밝은 보색."}
                        {compMethod === "neutral_target" && "투광 후 무채색(L50,a0,b0)에 가까워지도록 계산합니다. 색 왜곡 최소화 목적."}
                      </div>
                    </div>

                    {/* 추천 잉크 */}
                    {compResult.recommended_inks.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-purple-700 mb-2">보색에 가까운 잉크 Top {compResult.recommended_inks.length}</h4>
                        <div className="space-y-1">
                          {compResult.recommended_inks.map((ink, i) => (
                            <div key={ink.ink_id} className="flex items-center gap-2 bg-white rounded border px-3 py-2">
                              <span className="text-xs font-bold text-purple-600 w-5">#{i + 1}</span>
                              <div className="w-6 h-6 rounded border border-gray-200" style={{ backgroundColor: labToRgb(ink.ink_Lab.L, ink.ink_Lab.a, ink.ink_Lab.b) }} />
                              <span className="text-sm flex-1">{ink.ink_name}</span>
                              <span className="text-[10px] text-gray-400">{ink.ink_type} {ink.manufacturer && `· ${ink.manufacturer}`}</span>
                              <span className={`text-xs font-bold ${ink.delta_E_2000 < 3 ? "text-green-600" : ink.delta_E_2000 < 6 ? "text-yellow-600" : "text-red-600"}`}>
                                ΔE00={ink.delta_E_2000}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 유사 과거 샘플 */}
                    {compResult.similar_past_samples.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-purple-700 mb-2">보색과 유사한 과거 인쇄 샘플 Top {compResult.similar_past_samples.length}</h4>
                        <div className="space-y-1">
                          {compResult.similar_past_samples.map((s, i) => (
                            <div key={s.sample_id} className="flex items-center gap-2 bg-white rounded border px-3 py-2">
                              <span className="text-xs font-bold text-teal-600 w-5">#{i + 1}</span>
                              <div className="w-6 h-6 rounded border border-gray-200" style={{ backgroundColor: labToRgb(s.print_Lab.L, s.print_Lab.a, s.print_Lab.b) }} />
                              <span className="text-sm flex-1">{s.recipe_name || `샘플 #${s.sample_id}`}</span>
                              <span className="text-[10px] text-gray-400">{s.color_name && `${s.color_name} ·`} L={s.print_Lab.L} a={s.print_Lab.a} b={s.print_Lab.b}</span>
                              <span className={`text-xs font-bold ${s.delta_E_2000 < 3 ? "text-green-600" : s.delta_E_2000 < 6 ? "text-yellow-600" : "text-red-600"}`}>
                                ΔE00={s.delta_E_2000}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {compResult.recommended_inks.length === 0 && compResult.similar_past_samples.length === 0 && (
                      <p className="text-sm text-gray-500">등록된 잉크/샘플이 없어 추천 결과가 없습니다. 마스터 데이터에 잉크를 등록하면 보색 잉크 추천이 표시됩니다.</p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* 추천 결과 */}
        {showRecommend && (
          <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-indigo-800">AI 레시피 추천 (유사도 기반)</h3>
              <button onClick={() => setShowRecommend(false)} className="text-gray-400 hover:text-gray-600 text-sm">닫기 ✕</button>
            </div>
            {recommendMessage && <p className="text-sm text-gray-500 mb-2">{recommendMessage}</p>}
            {recommendations.length > 0 && (
              <div className="space-y-3">
                {recommendations.map((rec, idx) => (
                  <div key={rec.sample_id} className="bg-white rounded-lg border p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-indigo-600">#{idx + 1}</span>
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
                        잉크: {rec.ink_items.map((i: any, j: number) => (<span key={j}>{i.ink_name} {i.weight_g}g{j < rec.ink_items.length - 1 ? " + " : ""}</span>))}
                        {rec.thinner_pct ? ` | 신너 ${rec.thinner_pct}%` : ""}
                        {rec.hardener_pct ? ` | 경화제 ${rec.hardener_pct}%` : ""}
                      </div>
                    )}
                    {rounds.length > 0 && (
                      <div className="mt-2">
                        <button onClick={() => applyRecommendation(rec, rounds[rounds.length - 1].round_id)} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200">
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
                        {r.best_delta_E !== null && (<span className={`text-sm ${deltaColor(r.best_delta_E)}`}>최소 ΔE = {r.best_delta_E}</span>)}
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
              <label className="text-xs text-gray-600 font-semibold block mb-1">타겟 Lab (L* a* b*) — 붙여넣기 지원</label>
              <div className="flex gap-2 items-center">
                <input type="number" placeholder="L" value={colorEditForm.target_L ?? ""} onChange={(e) => setColorEditForm({ ...colorEditForm, target_L: e.target.value ? parseFloat(e.target.value) : null })} onPaste={handleTargetPaste} className="w-24 border rounded px-2 py-1 text-sm" />
                <input type="number" placeholder="a" value={colorEditForm.target_a ?? ""} onChange={(e) => setColorEditForm({ ...colorEditForm, target_a: e.target.value ? parseFloat(e.target.value) : null })} className="w-24 border rounded px-2 py-1 text-sm" />
                <input type="number" placeholder="b" value={colorEditForm.target_b ?? ""} onChange={(e) => setColorEditForm({ ...colorEditForm, target_b: e.target.value ? parseFloat(e.target.value) : null })} className="w-24 border rounded px-2 py-1 text-sm" />
                <ColorBox L={colorEditForm.target_L} a={colorEditForm.target_a} b={colorEditForm.target_b} label="미리보기" />
                <span className="text-[10px] text-gray-400">L 필드에 &quot;85.2 -3.1 12.4&quot; 붙여넣기 가능</span>
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
            const isTableView = tableViewRounds.has(round.round_id);
            const bestInRound = samples.filter(s => s.delta_E !== null).sort((a, b) => a.delta_E! - b.delta_E!)[0] || null;
            return (
              <div key={round.round_id} className="mb-4">
                <div className="bg-white rounded-lg shadow-sm border px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50" onClick={() => toggleRound(round.round_id)}>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm">{isOpen ? "▼" : "▶"}</span>
                    <span className="font-semibold text-gray-800">라운드 {round.round_number}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">샘플 {samples.length}건</span>
                    {bestInRound && <span className={`text-xs ${deltaColor(bestInRound.delta_E)}`}>최소 ΔE: {bestInRound.delta_E}</span>}
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openNewSampleForm(round.round_id)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">+ 빈 샘플</button>
                    <button onClick={() => openNewFromPrevious(round.round_id)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium" title="이전 샘플의 레시피를 복사하여 새 샘플 생성">📋 이전 기반</button>
                    {samples.length > 0 && isOpen && (
                      <button onClick={() => toggleTableView(round.round_id)} className="text-gray-500 hover:text-gray-700 text-xs border px-2 py-0.5 rounded">
                        {isTableView ? "카드 뷰" : "테이블 뷰"}
                      </button>
                    )}
                    <button onClick={() => deleteRound(round.round_id)} className="text-red-400 hover:text-red-600 text-sm">삭제</button>
                  </div>
                </div>

                {/* 샘플 입력 폼 */}
                {showSampleForm === round.round_id && (
                  <div className="ml-6 mt-2 bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-semibold text-green-800">
                        {editingSampleId ? "샘플 수정" : "새 샘플 등록"}
                        {duplicatedFrom && <span className="ml-2 text-xs font-normal text-green-600 bg-green-100 px-2 py-0.5 rounded">📋 {duplicatedFrom} 기반</span>}
                      </h3>
                    </div>

                    {/* 레시피 섹션 */}
                    <div className="bg-white rounded-lg border p-3 mb-3">
                      <div className="text-xs font-semibold text-gray-500 mb-2">레시피</div>
                      <div className="mb-2"><input type="text" value={sampleForm.recipe_name} onChange={(e) => setSampleForm({ ...sampleForm, recipe_name: e.target.value })} placeholder="레시피명" className="w-full border rounded px-2 py-1.5 text-sm" /></div>
                      <div className="mb-2">
                        <div className="flex justify-between items-center mb-1"><label className="text-xs text-gray-600 font-semibold">잉크 배합</label><button onClick={addInkRow} className="text-xs text-blue-600 hover:text-blue-800">+ 잉크 추가</button></div>
                        {sampleForm.ink_items.map((item, idx) => (
                          <div key={idx} className="relative flex gap-2 mb-1">
                            <div className="flex-1 relative">
                              <input type="text" placeholder="잉크명 (검색 가능)" value={item.ink_name}
                                onChange={(e) => updateInkRow(idx, "ink_name", e.target.value)}
                                onFocus={() => {
                                  setActiveInkIdx(idx);
                                  if (item.ink_name.trim()) {
                                    api.get(`/api/search/inks?q=${encodeURIComponent(item.ink_name)}`).then(r => setInkSearchResults(r.data)).catch(() => {});
                                  } else if (recentlyUsedInks.length > 0) {
                                    // 빈 상태에서 포커스 → 최근 사용 잉크 표시
                                    setInkSearchResults(recentlyUsedInks.map((name, i) => ({
                                      ink_id: -(i + 1), ink_name: name, ink_type: "최근 사용",
                                    })));
                                  }
                                }}
                                onBlur={() => setTimeout(() => { if (activeInkIdx === idx) { setActiveInkIdx(null); setInkSearchResults([]); } }, 200)}
                                className="w-full border rounded px-2 py-1 text-sm" />
                              {activeInkIdx === idx && inkSearchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-40 overflow-y-auto">
                                  {inkSearchResults.map((ink, i) => {
                                    const isRecent = ink.ink_type === "최근 사용";
                                    return (
                                      <div key={`${ink.ink_id}-${i}`} onMouseDown={() => selectInk(idx, ink)}
                                        className="px-2 py-1.5 hover:bg-blue-50 cursor-pointer text-sm flex items-center gap-2">
                                        {isRecent ? (
                                          <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded">최근</span>
                                        ) : ink.solid_L_SCI != null && (
                                          <div className="w-4 h-4 rounded border border-gray-200 flex-shrink-0" style={{ backgroundColor: labToRgb(ink.solid_L_SCI, ink.solid_a_SCI, ink.solid_b_SCI) }} />
                                        )}
                                        <span className="font-medium">{ink.ink_name}</span>
                                        {!isRecent && <span className="text-xs text-gray-400 truncate">{[ink.ink_type, ink.manufacturer, ink.color_index].filter(Boolean).join(" · ")}</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <input type="number" placeholder="g" value={item.weight_g || ""} onChange={(e) => updateInkRow(idx, "weight_g", parseFloat(e.target.value) || 0)} className="w-20 border rounded px-2 py-1 text-sm" />
                            {sampleForm.ink_items.length > 1 && <button onClick={() => removeInkRow(idx)} className="text-red-400 text-xs">✕</button>}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-xs text-gray-600 mb-1">신너 %</label><input type="number" value={sampleForm.thinner_pct || ""} onChange={(e) => setSampleForm({ ...sampleForm, thinner_pct: parseFloat(e.target.value) || 0 })} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
                        <div><label className="block text-xs text-gray-600 mb-1">경화제 %</label><input type="number" value={sampleForm.hardener_pct || ""} onChange={(e) => setSampleForm({ ...sampleForm, hardener_pct: parseFloat(e.target.value) || 0 })} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
                      </div>
                    </div>

                    {/* 측정값 섹션 */}
                    <div className="bg-white rounded-lg border p-3 mb-3">
                      <div className="text-xs font-semibold text-gray-500 mb-2">측정값 — L 필드에 &quot;L a b&quot; 붙여넣기 가능</div>
                      <div className="mb-3">
                        <label className="text-xs text-gray-600 font-semibold block mb-1">베이스 측정 (L* a* b*)</label>
                        <div className="flex gap-2 items-center">
                          <input type="number" placeholder="L" value={sampleForm.base_L_SCI ?? ""} onChange={(e) => setSampleForm({ ...sampleForm, base_L_SCI: e.target.value ? parseFloat(e.target.value) : null })} onPaste={handleBasePaste} className="w-1/3 border rounded px-2 py-1 text-sm" />
                          <input type="number" placeholder="a" value={sampleForm.base_a_SCI ?? ""} onChange={(e) => setSampleForm({ ...sampleForm, base_a_SCI: e.target.value ? parseFloat(e.target.value) : null })} className="w-1/3 border rounded px-2 py-1 text-sm" />
                          <input type="number" placeholder="b" value={sampleForm.base_b_SCI ?? ""} onChange={(e) => setSampleForm({ ...sampleForm, base_b_SCI: e.target.value ? parseFloat(e.target.value) : null })} className="w-1/3 border rounded px-2 py-1 text-sm" />
                          <ColorBox L={sampleForm.base_L_SCI} a={sampleForm.base_a_SCI} b={sampleForm.base_b_SCI} label="베이스" />
                        </div>
                      </div>
                      <div className="mb-2">
                        <label className="text-xs text-gray-600 font-semibold block mb-1">인쇄 측정 (L* a* b*)</label>
                        <div className="flex gap-2 items-center">
                          <input type="number" placeholder="L" value={sampleForm.print_L_SCI ?? ""} onChange={(e) => setSampleForm({ ...sampleForm, print_L_SCI: e.target.value ? parseFloat(e.target.value) : null })} onPaste={handlePrintPaste} className="w-1/3 border rounded px-2 py-1 text-sm" />
                          <input type="number" placeholder="a" value={sampleForm.print_a_SCI ?? ""} onChange={(e) => setSampleForm({ ...sampleForm, print_a_SCI: e.target.value ? parseFloat(e.target.value) : null })} className="w-1/3 border rounded px-2 py-1 text-sm" />
                          <input type="number" placeholder="b" value={sampleForm.print_b_SCI ?? ""} onChange={(e) => setSampleForm({ ...sampleForm, print_b_SCI: e.target.value ? parseFloat(e.target.value) : null })} className="w-1/3 border rounded px-2 py-1 text-sm" />
                          <ColorBox L={sampleForm.print_L_SCI} a={sampleForm.print_a_SCI} b={sampleForm.print_b_SCI} label="인쇄" />
                        </div>
                      </div>
                      {/* 실시간 ΔE 미리 계산 */}
                      {previewDeltaE !== null && (
                        <div className="mt-2 flex items-center gap-2 px-2 py-1.5 rounded" style={{ backgroundColor: `${deltaColorHex(previewDeltaE)}10` }}>
                          <span className="text-xs text-gray-600">예상 ΔE:</span>
                          <span className="text-sm font-bold" style={{ color: deltaColorHex(previewDeltaE) }}>
                            {previewDeltaE.toFixed(2)}
                          </span>
                          {previewDeltaE <= 1.0 && <span className="text-xs text-green-600">✓ 우수</span>}
                          {previewDeltaE > 1.0 && previewDeltaE <= 3.0 && <span className="text-xs text-yellow-600">양호</span>}
                          {previewDeltaE > 3.0 && previewDeltaE <= 6.0 && <span className="text-xs text-orange-600">보통</span>}
                          {previewDeltaE > 6.0 && <span className="text-xs text-red-600">미흡</span>}
                          <span className="text-[10px] text-gray-400 ml-auto">등록 전 미리보기 (CIEDE2000)</span>
                        </div>
                      )}
                    </div>

                    {/* 메모 */}
                    <div className="mb-3"><input type="text" placeholder="메모 (선택)" value={sampleForm.note} onChange={(e) => setSampleForm({ ...sampleForm, note: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={cancelForm} className="bg-gray-400 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-500">취소</button>
                      <button onClick={() => saveSample(round.round_id)} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">{editingSampleId ? "수정 완료" : "등록"}</button>
                    </div>
                  </div>
                )}

                {/* 샘플 목록 */}
                {isOpen && (
                  <div className="ml-6 mt-2">
                    {samples.length === 0 && showSampleForm !== round.round_id ? (
                      <p className="text-sm text-gray-400 py-2">등록된 샘플이 없습니다.</p>
                    ) : isTableView ? (
                      /* ===== 테이블 뷰 ===== */
                      <div className="overflow-x-auto bg-white rounded-lg border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-gray-50 text-xs text-gray-500">
                              <th className="py-2 px-3 text-left">#</th>
                              <th className="py-2 px-3 text-left">레시피</th>
                              <th className="py-2 px-3 text-left">잉크 배합</th>
                              <th className="py-2 px-3 text-right">L*</th>
                              <th className="py-2 px-3 text-right">a*</th>
                              <th className="py-2 px-3 text-right">b*</th>
                              <th className="py-2 px-3 text-right">ΔE</th>
                              <th className="py-2 px-3 text-right">액션</th>
                            </tr>
                          </thead>
                          <tbody>
                            {samples.map(sample => {
                              const isBest = bestInRound?.sample_id === sample.sample_id && sample.delta_E !== null;
                              return (
                                <tr key={sample.sample_id} className={`border-b last:border-0 ${isBest ? "bg-green-50" : "hover:bg-gray-50"}`}>
                                  <td className="py-2 px-3 font-medium whitespace-nowrap">
                                    {sample.sample_number}
                                    {sample.is_confirmed && <span className="ml-1">✅</span>}
                                    {isBest && !sample.is_confirmed && <span className="ml-1 text-[10px] text-green-600">best</span>}
                                  </td>
                                  <td className="py-2 px-3 text-gray-600 max-w-[120px] truncate">{sample.recipe_name || "-"}</td>
                                  <td className="py-2 px-3 text-xs text-gray-500 max-w-[200px] truncate">
                                    {sample.ink_items?.map((i: any) => `${i.ink_name} ${i.weight_g}g`).join(" + ") || "-"}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono text-xs">{sample.print_L_SCI ?? "-"}</td>
                                  <td className="py-2 px-3 text-right font-mono text-xs">{sample.print_a_SCI ?? "-"}</td>
                                  <td className="py-2 px-3 text-right font-mono text-xs">{sample.print_b_SCI ?? "-"}</td>
                                  <td className={`py-2 px-3 text-right font-bold text-xs ${deltaColor(sample.delta_E)}`}>
                                    {sample.delta_E !== null ? sample.delta_E.toFixed(2) : "-"}
                                  </td>
                                  <td className="py-2 px-3 text-right whitespace-nowrap">
                                    <button onClick={() => duplicateSample(sample, round.round_id)} className="text-indigo-500 hover:text-indigo-700 text-xs mr-1.5" title="이 샘플의 레시피를 복사하여 새 샘플 생성">복제</button>
                                    <button onClick={() => openEditSampleForm(sample)} className="text-blue-500 hover:text-blue-700 text-xs mr-1.5">수정</button>
                                    <button onClick={() => deleteSample(sample.sample_id)} className="text-red-400 hover:text-red-600 text-xs">삭제</button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      /* ===== 카드 뷰 ===== */
                      <div className="space-y-2">
                        {samples.map((sample) => {
                          const isBest = bestInRound?.sample_id === sample.sample_id && sample.delta_E !== null;
                          return (
                            <div key={sample.sample_id} className={`bg-white rounded-lg border px-4 py-3 ${isBest ? "border-green-300 bg-green-50/30" : ""}`}>
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-800 text-sm">샘플 #{sample.sample_number}</span>
                                  {sample.recipe_name && <span className="text-xs text-gray-500">{sample.recipe_name}</span>}
                                  {sample.is_confirmed && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">확정</span>}
                                  {isBest && !sample.is_confirmed && <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded border border-green-200">best</span>}
                                  <ColorBox L={sample.base_L_SCI} a={sample.base_a_SCI} b={sample.base_b_SCI} label="베이스" />
                                  <ColorBox L={sample.print_L_SCI} a={sample.print_a_SCI} b={sample.print_b_SCI} label="인쇄" />
                                </div>
                                <div className="flex items-center gap-2">
                                  {!sample.is_confirmed && (
                                    <button
                                      onClick={async () => {
                                        if (!confirm(`샘플 #${sample.sample_number}를 확정레시피로 등록하시겠습니까?`)) return;
                                        try {
                                          await api.post(`/api/recipes/from-sample/${sample.sample_id}`);
                                          alert('확정레시피가 등록되었습니다!');
                                          fetchRounds();
                                        } catch (err: any) {
                                          const msg = err.response?.data?.detail || '확정 실패';
                                          alert(msg);
                                        }
                                      }}
                                      className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                                    >
                                      이 샘플로 확정
                                    </button>
                                  )}
                                  <button onClick={() => duplicateSample(sample, round.round_id)} className="text-indigo-500 hover:text-indigo-700 text-xs font-medium" title="이 샘플의 레시피를 복사하여 새 샘플 생성">복제</button>
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
                                  {sample.delta_L !== null && (
                                    <span className="text-gray-400">ΔL:{sample.delta_L} Δa:{sample.delta_a} Δb:{sample.delta_b}</span>
                                  )}
                                </div>
                              )}
                              {sample.note && <div className="mt-1 text-xs text-gray-400">메모: {sample.note}</div>}
                            </div>
                          );
                        })}
                      </div>
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
