"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

interface ColorDetail {
  color_id: number;
  group_id: number | null;
  color_name: string;
  mode: string;
  customer: string | null;
  product: string | null;
  paint_shop: string | null;
  dev_stage: string | null;
  manager: string | null;
  status: string;
  target_L: number | null;
  target_a: number | null;
  target_b: number | null;
}

interface RoundData {
  round_id: number;
  color_id: number;
  round_number: number;
  plate_id: number | null;
  pad_id: number | null;
  round_memo: string | null;
}

interface SampleData {
  sample_id: number;
  round_id: number;
  sample_number: number;
  recipe_name: string | null;
  ink_items: any[] | null;
  ink_total_g: number | null;
  thinner_pct: number | null;
  thinner_g: number | null;
  hardener_pct: number | null;
  hardener_g: number | null;
  total_weight_g: number | null;
  base_L_SCI: number | null;
  base_a_SCI: number | null;
  base_b_SCI: number | null;
  print_L_SCI: number | null;
  print_a_SCI: number | null;
  print_b_SCI: number | null;
  delta_L: number | null;
  delta_a: number | null;
  delta_b: number | null;
  delta_E: number | null;
  trans_L_SCI: number | null;
  trans_a_SCI: number | null;
  trans_b_SCI: number | null;
  trans_delta_E: number | null;
  is_confirmed: boolean;
  note: string | null;
}

interface InkItem {
  ink_name: string;
  weight_g: number;
}

interface SampleFormData {
  recipe_name: string;
  ink_items: InkItem[];
  thinner_pct: number;
  hardener_pct: number;
  base_L_SCI: number | null;
  base_a_SCI: number | null;
  base_b_SCI: number | null;
  print_L_SCI: number | null;
  print_a_SCI: number | null;
  print_b_SCI: number | null;
  note: string;
}

const emptySampleForm: SampleFormData = {
  recipe_name: "",
  ink_items: [{ ink_name: "", weight_g: 0 }],
  thinner_pct: 0,
  hardener_pct: 0,
  base_L_SCI: null,
  base_a_SCI: null,
  base_b_SCI: null,
  print_L_SCI: null,
  print_a_SCI: null,
  print_b_SCI: null,
  note: "",
};

export default function ColorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const colorId = Number(params.id);

  const [color, setColor] = useState<ColorDetail | null>(null);
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [samplesByRound, setSamplesByRound] = useState<Record<number, SampleData[]>>({});
  const [openRoundIds, setOpenRoundIds] = useState<Set<number>>(new Set());

  // 샘플 추가/수정 폼
  const [showSampleForm, setShowSampleForm] = useState<number | null>(null);
  const [editingSampleId, setEditingSampleId] = useState<number | null>(null);
  const [sampleForm, setSampleForm] = useState<SampleFormData>({ ...emptySampleForm });

  useEffect(() => {
    fetchColor();
    fetchRounds();
  }, [colorId]);

  const fetchColor = async () => {
    try {
      const res = await api.get(`/api/colors/${colorId}`);
      setColor(res.data);
    } catch (err) {
      console.error("컬러 로드 실패:", err);
    }
  };

  const fetchRounds = async () => {
    try {
      const res = await api.get(`/api/rounds/?color_id=${colorId}`);
      setRounds(res.data);
      const samplesMap: Record<number, SampleData[]> = {};
      for (const r of res.data) {
        const sRes = await api.get(`/api/samples/?round_id=${r.round_id}`);
        samplesMap[r.round_id] = sRes.data;
      }
      setSamplesByRound(samplesMap);
    } catch (err) {
      console.error("라운드 로드 실패:", err);
    }
  };

  const createRound = async () => {
    try {
      const nextNumber = rounds.length + 1;
      await api.post("/api/rounds/", {
        color_id: colorId,
        round_number: nextNumber,
      });
      fetchRounds();
    } catch (err) {
      console.error("라운드 생성 실패:", err);
    }
  };

  const deleteRound = async (roundId: number) => {
    if (!confirm("이 라운드를 삭제하시겠습니까? 포함된 샘플도 삭제됩니다.")) return;
    try {
      await api.delete(`/api/rounds/${roundId}`);
      fetchRounds();
    } catch (err) {
      console.error("라운드 삭제 실패:", err);
    }
  };

  const toggleRound = (roundId: number) => {
    setOpenRoundIds((prev) => {
      const next = new Set(prev);
      if (next.has(roundId)) next.delete(roundId);
      else next.add(roundId);
      return next;
    });
  };

  // 잉크 항목 관리
  const addInkRow = () => {
    setSampleForm({
      ...sampleForm,
      ink_items: [...sampleForm.ink_items, { ink_name: "", weight_g: 0 }],
    });
  };

  const removeInkRow = (index: number) => {
    const items = [...sampleForm.ink_items];
    items.splice(index, 1);
    setSampleForm({ ...sampleForm, ink_items: items });
  };

  const updateInkRow = (index: number, field: string, value: string | number) => {
    const items = [...sampleForm.ink_items];
    items[index] = { ...items[index], [field]: value };
    setSampleForm({ ...sampleForm, ink_items: items });
  };

  // 새 샘플 폼 열기
  const openNewSampleForm = (roundId: number) => {
    setEditingSampleId(null);
    setSampleForm({ ...emptySampleForm });
    setShowSampleForm(roundId);
    if (!openRoundIds.has(roundId)) {
      setOpenRoundIds((prev) => new Set(prev).add(roundId));
    }
  };

  // 수정 폼 열기
  const openEditSampleForm = (sample: SampleData) => {
    setEditingSampleId(sample.sample_id);
    setSampleForm({
      recipe_name: sample.recipe_name || "",
      ink_items:
        sample.ink_items && sample.ink_items.length > 0
          ? sample.ink_items.map((i: any) => ({ ink_name: i.ink_name || "", weight_g: i.weight_g || 0 }))
          : [{ ink_name: "", weight_g: 0 }],
      thinner_pct: sample.thinner_pct || 0,
      hardener_pct: sample.hardener_pct || 0,
      base_L_SCI: sample.base_L_SCI,
      base_a_SCI: sample.base_a_SCI,
      base_b_SCI: sample.base_b_SCI,
      print_L_SCI: sample.print_L_SCI,
      print_a_SCI: sample.print_a_SCI,
      print_b_SCI: sample.print_b_SCI,
      note: sample.note || "",
    });
    setShowSampleForm(sample.round_id);
  };

  // 샘플 저장 (생성 또는 수정)
  const saveSample = async (roundId: number) => {
    const payload = {
      round_id: roundId,
      sample_number: 0,
      recipe_name: sampleForm.recipe_name || null,
      ink_items: sampleForm.ink_items.filter((i) => i.ink_name.trim() !== ""),
      thinner_pct: sampleForm.thinner_pct || null,
      hardener_pct: sampleForm.hardener_pct || null,
      base_L_SCI: sampleForm.base_L_SCI,
      base_a_SCI: sampleForm.base_a_SCI,
      base_b_SCI: sampleForm.base_b_SCI,
      print_L_SCI: sampleForm.print_L_SCI,
      print_a_SCI: sampleForm.print_a_SCI,
      print_b_SCI: sampleForm.print_b_SCI,
      note: sampleForm.note || null,
    };

    try {
      if (editingSampleId) {
        // 수정
        await api.put(`/api/samples/${editingSampleId}`, payload);
      } else {
        // 새로 생성
        const samples = samplesByRound[roundId] || [];
        payload.sample_number = samples.length + 1;
        await api.post("/api/samples/", payload);
      }
      setShowSampleForm(null);
      setEditingSampleId(null);
      setSampleForm({ ...emptySampleForm });
      fetchRounds();
    } catch (err) {
      console.error("샘플 저장 실패:", err);
    }
  };

  const deleteSample = async (sampleId: number) => {
    if (!confirm("이 샘플을 삭제하시겠습니까?")) return;
    try {
      await api.delete(`/api/samples/${sampleId}`);
      fetchRounds();
    } catch (err) {
      console.error("샘플 삭제 실패:", err);
    }
  };

  const cancelForm = () => {
    setShowSampleForm(null);
    setEditingSampleId(null);
    setSampleForm({ ...emptySampleForm });
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "confirmed":
        return "✅ 확정";
      case "in_progress":
        return "🔄 진행중";
      case "hold":
        return "⏸ 보류";
      default:
        return status;
    }
  };

  const deltaColor = (value: number | null) => {
    if (value === null) return "text-gray-400";
    if (value <= 1.0) return "text-green-600 font-bold";
    if (value <= 3.0) return "text-yellow-600 font-bold";
    return "text-red-600 font-bold";
  };

  if (!color) {
    return <div className="p-8 text-center text-gray-400">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/")}
                className="text-gray-500 hover:text-gray-800 text-sm"
              >
                ← 목록
              </button>
              <h1 className="text-xl font-bold text-gray-800">
                {color.color_name}
              </h1>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {color.mode === "translucency" ? "투광" : "매칭"}
              </span>
              <span className="text-xs">{statusLabel(color.status)}</span>
            </div>
            <button
              onClick={createRound}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              + 라운드 추가
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500 flex gap-4">
            <span>고객사: {color.customer || "-"}</span>
            <span>제품: {color.product || "-"}</span>
            <span>도료사: {color.paint_shop || "-"}</span>
            <span>단계: {color.dev_stage || "-"}</span>
            <span>담당: {color.manager || "-"}</span>
          </div>
          {color.target_L !== null && (
            <div className="mt-1 text-xs text-gray-500">
              타겟 Lab: ({color.target_L}, {color.target_a}, {color.target_b})
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {rounds.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-2">아직 라운드가 없습니다.</p>
            <p className="text-sm">&quot;라운드 추가&quot; 버튼으로 시작하세요.</p>
          </div>
        ) : (
          rounds.map((round) => {
            const samples = samplesByRound[round.round_id] || [];
            const isOpen = openRoundIds.has(round.round_id);

            return (
              <div key={round.round_id} className="mb-4">
                <div
                  className="bg-white rounded-lg shadow-sm border px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleRound(round.round_id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm">
                      {isOpen ? "▼" : "▶"}
                    </span>
                    <span className="font-semibold text-gray-800">
                      라운드 {round.round_number}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      샘플 {samples.length}건
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openNewSampleForm(round.round_id);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      + 샘플
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRound(round.round_id);
                      }}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                {/* 샘플 추가/수정 폼 */}
                {showSampleForm === round.round_id && (
                  <div className="ml-6 mt-2 bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-green-800 mb-3">
                      {editingSampleId ? "샘플 수정" : "새 샘플 등록"}
                    </h3>

                    <div className="mb-3">
                      <label className="block text-xs text-gray-600 mb-1">
                        레시피명
                      </label>
                      <input
                        type="text"
                        value={sampleForm.recipe_name}
                        onChange={(e) =>
                          setSampleForm({ ...sampleForm, recipe_name: e.target.value })
                        }
                        className="w-full border rounded px-2 py-1.5 text-sm"
                      />
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-gray-600 font-semibold">
                          잉크 배합
                        </label>
                        <button
                          onClick={addInkRow}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          + 잉크 추가
                        </button>
                      </div>
                      {sampleForm.ink_items.map((item, idx) => (
                        <div key={idx} className="flex gap-2 mb-1">
                          <input
                            type="text"
                            placeholder="잉크명"
                            value={item.ink_name}
                            onChange={(e) =>
                              updateInkRow(idx, "ink_name", e.target.value)
                            }
                            className="flex-1 border rounded px-2 py-1 text-sm"
                          />
                          <input
                            type="number"
                            placeholder="g"
                            value={item.weight_g || ""}
                            onChange={(e) =>
                              updateInkRow(idx, "weight_g", parseFloat(e.target.value) || 0)
                            }
                            className="w-20 border rounded px-2 py-1 text-sm"
                          />
                          {sampleForm.ink_items.length > 1 && (
                            <button
                              onClick={() => removeInkRow(idx)}
                              className="text-red-400 text-xs"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          신너 %
                        </label>
                        <input
                          type="number"
                          value={sampleForm.thinner_pct || ""}
                          onChange={(e) =>
                            setSampleForm({
                              ...sampleForm,
                              thinner_pct: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full border rounded px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          경화제 %
                        </label>
                        <input
                          type="number"
                          value={sampleForm.hardener_pct || ""}
                          onChange={(e) =>
                            setSampleForm({
                              ...sampleForm,
                              hardener_pct: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full border rounded px-2 py-1.5 text-sm"
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="text-xs text-gray-600 font-semibold block mb-1">
                        베이스 측정 (L* a* b*)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="L"
                          value={sampleForm.base_L_SCI ?? ""}
                          onChange={(e) =>
                            setSampleForm({
                              ...sampleForm,
                              base_L_SCI: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                          className="w-1/3 border rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="a"
                          value={sampleForm.base_a_SCI ?? ""}
                          onChange={(e) =>
                            setSampleForm({
                              ...sampleForm,
                              base_a_SCI: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                          className="w-1/3 border rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="b"
                          value={sampleForm.base_b_SCI ?? ""}
                          onChange={(e) =>
                            setSampleForm({
                              ...sampleForm,
                              base_b_SCI: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                          className="w-1/3 border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="text-xs text-gray-600 font-semibold block mb-1">
                        인쇄 측정 (L* a* b*)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="L"
                          value={sampleForm.print_L_SCI ?? ""}
                          onChange={(e) =>
                            setSampleForm({
                              ...sampleForm,
                              print_L_SCI: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                          className="w-1/3 border rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="a"
                          value={sampleForm.print_a_SCI ?? ""}
                          onChange={(e) =>
                            setSampleForm({
                              ...sampleForm,
                              print_a_SCI: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                          className="w-1/3 border rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="b"
                          value={sampleForm.print_b_SCI ?? ""}
                          onChange={(e) =>
                            setSampleForm({
                              ...sampleForm,
                              print_b_SCI: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                          className="w-1/3 border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="block text-xs text-gray-600 mb-1">메모</label>
                      <input
                        type="text"
                        value={sampleForm.note}
                        onChange={(e) =>
                          setSampleForm({ ...sampleForm, note: e.target.value })
                        }
                        className="w-full border rounded px-2 py-1.5 text-sm"
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={cancelForm}
                        className="bg-gray-400 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-500"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => saveSample(round.round_id)}
                        className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
                      >
                        {editingSampleId ? "수정 완료" : "등록"}
                      </button>
                    </div>
                  </div>
                )}

                {/* 샘플 목록 */}
                {isOpen && (
                  <div className="ml-6 mt-2 space-y-2">
                    {samples.length === 0 && showSampleForm !== round.round_id ? (
                      <p className="text-sm text-gray-400 py-2">
                        등록된 샘플이 없습니다.
                      </p>
                    ) : (
                      samples.map((sample) => (
                        <div
                          key={sample.sample_id}
                          className="bg-white rounded-lg border px-4 py-3"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium text-gray-800 text-sm">
                                샘플 #{sample.sample_number}
                              </span>
                              {sample.recipe_name && (
                                <span className="ml-2 text-xs text-gray-500">
                                  {sample.recipe_name}
                                </span>
                              )}
                              {sample.is_confirmed && (
                                <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                  확정
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEditSampleForm(sample)}
                                className="text-blue-500 hover:text-blue-700 text-xs"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => deleteSample(sample.sample_id)}
                                className="text-red-400 hover:text-red-600 text-xs"
                              >
                                삭제
                              </button>
                            </div>
                          </div>

                          {sample.ink_items && sample.ink_items.length > 0 && (
                            <div className="mt-2 text-xs text-gray-600">
                              <span className="font-semibold">잉크:</span>{" "}
                              {sample.ink_items.map((i: any, idx: number) => (
                                <span key={idx}>
                                  {i.ink_name} {i.weight_g}g
                                  {idx < sample.ink_items!.length - 1 ? " + " : ""}
                                </span>
                              ))}
                              {sample.ink_total_g && (
                                <span className="ml-2 text-gray-400">
                                  (합계: {sample.ink_total_g}g / 총: {sample.total_weight_g}g)
                                </span>
                              )}
                            </div>
                          )}

                          {sample.print_L_SCI !== null && (
                            <div className="mt-2 flex gap-4 text-xs">
                              <span className="text-gray-500">
                                인쇄 Lab: ({sample.print_L_SCI}, {sample.print_a_SCI},{" "}
                                {sample.print_b_SCI})
                              </span>
                              {sample.delta_E !== null && (
                                <span className={deltaColor(sample.delta_E)}>
                                  ΔE = {sample.delta_E}
                                </span>
                              )}
                            </div>
                          )}

                          {sample.note && (
                            <div className="mt-1 text-xs text-gray-400">
                              메모: {sample.note}
                            </div>
                          )}
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
