"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

interface Group { group_id: number; group_name: string; customer: string | null; product: string | null; manager: string | null; }
interface Pattern { pattern_id: number; group_id: number | null; pattern_name: string; color_count: number; status: string; dev_stage: string | null; memo: string | null; group?: Group; }
interface Slot { slot_id: number; pattern_id: number; position: number; slot_name: string; target_L: number | null; target_a: number | null; target_b: number | null; default_plate_id: number | null; default_pad_id: number | null; }
interface Round { round_id: number; pattern_id: number; round_number: number; work_date: string | null; work_location: string | null; worker: string | null; samples: Sample[]; }
interface Sample { sample_id: number; round_id: number; sample_number: number; base_L_SCI: number | null; base_a_SCI: number | null; base_b_SCI: number | null; sample_colors: SampleColor[]; }
interface SampleColor { sample_color_id: number; sample_id: number; slot_id: number | null; position: number; plate_id: number | null; pad_id: number | null; ink_color_id: number | null; recipe_name: string | null; ink_items: any; ink_total_g: number | null; thinner_pct: number | null; hardener_pct: number | null; thinner_g: number | null; hardener_g: number | null; total_weight_g: number | null; print_L_SCI: number | null; print_a_SCI: number | null; print_b_SCI: number | null; delta_L: number | null; delta_a: number | null; delta_b: number | null; delta_E: number | null; is_confirmed: boolean; memo: string | null; }
interface InkColor { ink_color_id: number; ink_color_name: string; ink_items: any; thinner_pct: number | null; hardener_pct: number | null; result_L_SCI: number | null; result_a_SCI: number | null; result_b_SCI: number | null; result_delta_E: number | null; }

const emptySampleColor: Partial<SampleColor> = {
  position: 1, plate_id: null, pad_id: null, ink_color_id: null, recipe_name: null,
  thinner_pct: null, hardener_pct: null, print_L_SCI: null, print_a_SCI: null, print_b_SCI: null, is_confirmed: false, memo: null
};

export default function PatternDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patternId = parseInt(params.id as string);

  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  // 새 샘플 생성
  const [showNewSample, setShowNewSample] = useState(false);
  const [newSampleNumber, setNewSampleNumber] = useState(1);
  const [workDate, setWorkDate] = useState(new Date().toISOString().split("T")[0]);
  const [workLocation, setWorkLocation] = useState("");
  const [worker, setWorker] = useState("");

  // 가져오기
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [importSlot, setImportSlot] = useState<number | null>(null);
  const [importFromMaster, setImportFromMaster] = useState(false);
  const [masterList, setMasterList] = useState<InkColor[]>([]);
  const [searchMaster, setSearchMaster] = useState("");

  // 마스터 등록
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [masterName, setMasterName] = useState("");
  const [masterSampleColor, setMasterSampleColor] = useState<SampleColor | null>(null);

  useEffect(() => { fetchData(); }, [patternId]);

  const fetchData = async () => {
    try {
      const [pRes, sRes, rRes] = await Promise.all([
        api.get(`/api/patterns/${patternId}`),
        api.get(`/api/pattern-slots/?pattern_id=${patternId}`),
        api.get(`/api/rounds/?pattern_id=${patternId}`)
      ]);
      setPattern(pRes.data);
      setSlots(sRes.data);
      setRounds(rRes.data);
    } catch (err) {
      console.error("데이터 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  const createRound = async () => {
    const maxRound = rounds.length > 0 ? Math.max(...rounds.map((r) => r.round_number)) : 0;
    try {
      await api.post("/api/rounds/", {
        pattern_id: patternId,
        round_number: maxRound + 1,
        work_date: workDate,
        work_location: workLocation,
        worker: worker
      });
      setShowNewSample(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const getSampleColorsForSlot = (slot: Slot) => {
    return rounds.flatMap((round) =>
      round.samples.flatMap((sample) =>
        sample.sample_colors.filter((sc) => sc.position === slot.position)
      )
    );
  };

  const getLatestSampleColorForSlot = (slot: Slot) => {
    const colors = getSampleColorsForSlot(slot);
    return colors.length > 0 ? colors[colors.length - 1] : null;
  };

  const getRecentUsedValues = (slot: Slot) => {
    // 같은 패턴의 최근 샘플에서 이 슬롯의 값 가져오기
    const latest = rounds.slice().reverse().find((r) => r.samples.length > 0);
    if (!latest) return null;
    const latestSample = latest.samples[latest.samples.length - 1];
    const sc = latestSample.sample_colors.find((c) => c.position === slot.position);
    if (!sc) return null;
    return {
      plate_id: sc.plate_id,
      pad_id: sc.pad_id,
      ink_color_id: sc.ink_color_id,
      ink_items: sc.ink_items,
      thinner_pct: sc.thinner_pct,
      hardener_pct: sc.hardener_pct
    };
  };

  const handleImportPlate = (slotId: number) => {
    if (!selectedSample) return;
    const source = selectedSample.sample_colors.find((c) => c.position === slotId);
    if (!source) return;

    // 현재 슬롯의 최신 SampleColor 업데이트
    const latest = getLatestSampleColorForSlot(slots.find((s) => s.slot_id === slotId)!);
    if (latest) {
      updateSampleColor(latest.sample_color_id, { plate_id: source.plate_id });
    }
    setShowImportModal(false);
  };

  const handleImportRecipe = (slotId: number) => {
    if (!selectedSample) return;
    const source = selectedSample.sample_colors.find((c) => c.position === slotId);
    if (!source) return;

    const latest = getLatestSampleColorForSlot(slots.find((s) => s.slot_id === slotId)!);
    if (latest) {
      updateSampleColor(latest.sample_color_id, {
        ink_color_id: source.ink_color_id,
        ink_items: source.ink_items,
        thinner_pct: source.thinner_pct,
        hardener_pct: source.hardener_pct
      });
    }
    setShowImportModal(false);
  };

  const handleMasterApply = (slotId: number, inkColorId: number) => {
    const latest = getLatestSampleColorForSlot(slots.find((s) => s.slot_id === slotId)!);
    if (latest) {
      updateSampleColor(latest.sample_color_id, { ink_color_id: inkColorId });
    }
    setImportFromMaster(false);
    setSearchMaster("");
    setMasterList([]);
  };

  const updateSampleColor = async (colorId: number, data: Partial<SampleColor>) => {
    try {
      await api.put(`/api/sample-colors/${colorId}`, data);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const createSampleColor = async (slotId: number, position: number) => {
    // 최근 사용값 자동 채움
    const recent = getRecentUsedValues(slots.find((s) => s.slot_id === slotId)!);
    const baseData = recent || { plate_id: null, pad_id: null, ink_color_id: null };

    try {
      const newColor: any = {
        sample_id: -1, // 임시, 실제로는 Sample 생성 후
        slot_id: slotId,
        position: position,
        ...baseData
      };
      // SampleColor는 Sample 생성 후 생성되므로 여기서는 Placeholder
    } catch (err) {
      console.error(err);
    }
  };

  const handleToMaster = (sampleColor: SampleColor, slot: Slot) => {
    setMasterSampleColor(sampleColor);
    setMasterName(`${slot.slot_name || positionToName(slot.position)} 배합`);
    setShowMasterModal(true);
  };

  const submitToMaster = async () => {
    if (!masterSampleColor) return;
    try {
      await api.post(`/api/sample-colors/${masterSampleColor.sample_color_id}/to-master`, masterName);
      setShowMasterModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const positionToName = (pos: number) => {
    const names = ["", "1 도", "2 도", "3 도", "4 도", "5 도"];
    return names[pos] || `${pos}도`;
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">로딩중...</div>;
  if (!pattern) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">패턴을 찾을 수 없습니다</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => router.push("/")} className="text-gray-500 hover:text-gray-700">← 돌아가기</button>
            <h1 className="text-xl font-bold text-gray-800">{pattern.pattern_name}</h1>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{pattern.status === "confirmed" ? "✅ 확정" : "🔄 진행중"}</span>
          </div>
          
          {/* 타겟 비교 위젯 */}
          <div className="flex gap-4 mt-3 flex-wrap">
            {slots.map((slot) => {
              const latest = getLatestSampleColorForSlot(slot);
              const deltaE = latest?.delta_E;
              return (
                <div key={slot.slot_id} className="bg-gray-50 border rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="text-sm font-medium">{slot.slot_name || positionToName(slot.position)}</span>
                  <span className="text-xs text-gray-500">
                    {slot.target_L !== null ? `T:(${slot.target_L?.toFixed(1)},${slot.target_a?.toFixed(1)},${slot.target_b?.toFixed(1)})` : ""}
                  </span>
                  {latest ? (
                    <span className={`text-xs font-bold ${deltaE && deltaE > 2 ? "text-red-600" : deltaE && deltaE > 1 ? "text-yellow-600" : "text-green-600"}`}>
                      ΔE={deltaE?.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 정보 */}
          <div className="mt-3 text-xs text-gray-600">
            {pattern.group?.customer} · {pattern.group?.product} · 담당: {pattern.group?.manager}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* 라운드 목록 */}
        <div className="space-y-4">
          {rounds.map((round) => (
            <div key={round.round_id} className="bg-white rounded-lg border shadow-sm">
              {/* 라운드 헤더 */}
              <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
                <div className="font-semibold text-gray-800">
                  라운드 {round.round_number}
                  <span className="ml-3 text-xs text-gray-500">
                    {round.work_date && `📅 ${round.work_date}`}
                    {round.work_location && `📍 ${round.work_location}`}
                    {round.worker && `👤 ${round.worker}`}
                  </span>
                </div>
                <button onClick={() => setShowNewSample(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700">
                  + 새 샘플
                </button>
              </div>

              {/* 샘플 목록 */}
              <div className="p-4 space-y-3">
                {round.samples.map((sample) => (
                  <div key={sample.sample_id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-medium text-gray-800">샘플 #{sample.sample_number}</span>
                      <div className="flex gap-2">
                        <button onClick={() => { setSelectedSample(sample); setShowImportModal(true); }} className="text-blue-600 hover:text-blue-800 text-sm">📥 가져오기</button>
                        <button className="text-gray-500 hover:text-gray-700 text-sm">수정</button>
                        <button className="text-red-400 hover:text-red-600 text-sm">삭제</button>
                      </div>
                    </div>

                    {/* 베이스 Lab */}
                    <div className="text-xs text-gray-500 mb-3">
                      베이스: ({sample.base_L_SCI?.toFixed(1)}, {sample.base_a_SCI?.toFixed(1)}, {sample.base_b_SCI?.toFixed(1)})
                    </div>

                    {/* 슬롯별 컬러 */}
                    <div className="grid gap-3">
                      {slots.map((slot) => {
                        const sampleColor = sample.sample_colors.find((sc) => sc.position === slot.position);
                        const latestColor = getLatestSampleColorForSlot(slot);
                        return (
                          <div key={slot.slot_id} className="border rounded-lg p-3 bg-white">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium">{slot.slot_name || positionToName(slot.position)}</span>
                              {sampleColor && (
                                <button onClick={() => handleToMaster(sampleColor, slot)} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded hover:bg-purple-200">
                                  📚 마스터 등록
                                </button>
                              )}
                            </div>

                            {sampleColor ? (
                              <div className="text-xs space-y-1">
                                <div className="flex gap-4">
                                  <span>동판: {sampleColor.plate_id ? `#${sampleColor.plate_id}` : "-"}</span>
                                  <span>패드: {sampleColor.pad_id ? `#${sampleColor.pad_id}` : "-"}</span>
                                  {sampleColor.ink_color_id && <span>배합: 📚 마스터</span>}
                                </div>
                                {sampleColor.print_L_SCI !== null && (
                                  <div className="flex gap-4">
                                    <span>인쇄: ({sampleColor.print_L_SCI.toFixed(1)}, {sampleColor.print_a_SCI?.toFixed(1)}, {sampleColor.print_b_SCI?.toFixed(1)})</span>
                                    <span className={sampleColor.delta_E && sampleColor.delta_E > 2 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                                      ΔE={sampleColor.delta_E?.toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                <div className="flex gap-2 mt-2">
                                  <button onClick={() => { setSelectedSample(sample); setImportSlot(slot.slot_id); handleImportPlate(slot.slot_id); }} className="text-blue-600 hover:text-blue-800 text-xs">📥 동판 가져오기</button>
                                  <button onClick={() => { setSelectedSample(sample); setImportSlot(slot.slot_id); handleImportRecipe(slot.slot_id); }} className="text-blue-600 hover:text-blue-800 text-xs">📥 배합 가져오기</button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400 py-2">
                                측정값 없음
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {round.samples.length === 0 && (
                  <div className="text-center py-4 text-gray-400">
                    아직 샘플이 없습니다.
                  </div>
                )}
              </div>
            </div>
          ))}

          {rounds.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border">
              <p className="text-lg text-gray-600 mb-4">아직 라운드가 없습니다</p>
              <button onClick={() => setShowNewSample(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                + 첫 번째 라운드 생성
              </button>
            </div>
          )}
        </div>
      </main>

      {/* 새 샘플 모달 */}
      {showNewSample && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">새 라운드 생성</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">작업일자</label>
                <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">작업장소</label>
                <input type="text" value={workLocation} onChange={(e) => setWorkLocation(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">작업자</label>
                <input type="text" value={worker} onChange={(e) => setWorker(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => setShowNewSample(false)} className="bg-gray-400 text-white px-4 py-2 rounded text-sm hover:bg-gray-500">취소</button>
              <button onClick={createRound} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">생성</button>
            </div>
          </div>
        </div>
      )}

      {/* 가져오기 모달 */}
      {showImportModal && selectedSample && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">샘플 #{selectedSample.sample_number} 에서 가져오기</h3>
            <div className="space-y-3">
              <div className="border rounded-lg p-3 bg-gray-50">
                <div className="text-xs text-gray-500 mb-2">샘플 #{selectedSample.sample_number}</div>
                {slots.map((slot) => {
                  const sc = selectedSample.sample_colors.find((c) => c.position === slot.position);
                  if (!sc) return null;
                  return (
                    <div key={slot.slot_id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <span className="text-sm">{slot.slot_name || positionToName(slot.position)}</span>
                      <div className="flex gap-2">
                        <button onClick={() => handleImportPlate(slot.slot_id)} className="text-blue-600 hover:text-blue-800 text-xs bg-blue-100 px-2 py-1 rounded">동판 가져오기</button>
                        <button onClick={() => handleImportRecipe(slot.slot_id)} className="text-blue-600 hover:text-blue-800 text-xs bg-blue-100 px-2 py-1 rounded">배합 가져오기</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => setShowImportModal(false)} className="bg-gray-400 text-white px-4 py-2 rounded text-sm hover:bg-gray-500">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 마스터 등록 모달 */}
      {showMasterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">마스터 배합 등록</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">배합명 *</label>
                <input type="text" value={masterName} onChange={(e) => setMasterName(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" autoFocus />
              </div>
              <div className="text-xs text-gray-500">
                현재 SampleColor 를 마스터 라이브러리에 저장합니다. 다른 패턴에서도 검색/사용할 수 있습니다.
              </div>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => setShowMasterModal(false)} className="bg-gray-400 text-white px-4 py-2 rounded text-sm hover:bg-gray-500">취소</button>
              <button onClick={submitToMaster} className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700">등록</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
