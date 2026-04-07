"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

type TabType = "inks" | "plates" | "pads" | "base_colors" | "white_refs";

export default function MasterPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabType>("inks");

  // 데이터
  const [inks, setInks] = useState<any[]>([]);
  const [plates, setPlates] = useState<any[]>([]);
  const [pads, setPads] = useState<any[]>([]);
  const [baseColors, setBaseColors] = useState<any[]>([]);
  const [whiteRefs, setWhiteRefs] = useState<any[]>([]);

  // 폼 표시
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [i, p, pd, bc, wr] = await Promise.all([
        api.get("/api/inks/"),
        api.get("/api/plates/"),
        api.get("/api/pads/"),
        api.get("/api/base-colors/"),
        api.get("/api/white-refs/"),
      ]);
      setInks(i.data);
      setPlates(p.data);
      setPads(pd.data);
      setBaseColors(bc.data);
      setWhiteRefs(wr.data);
    } catch (err) {
      console.error("마스터 데이터 로드 실패:", err);
    }
  };

  const tabConfig: Record<TabType, { label: string; endpoint: string; idField: string }> = {
    inks: { label: "잉크", endpoint: "/api/inks", idField: "ink_id" },
    plates: { label: "동판", endpoint: "/api/plates", idField: "plate_id" },
    pads: { label: "패드", endpoint: "/api/pads", idField: "pad_id" },
    base_colors: { label: "베이스컬러", endpoint: "/api/base-colors", idField: "base_color_id" },
    white_refs: { label: "백색기준", endpoint: "/api/white-refs", idField: "white_ref_id" },
  };

  const getData = () => {
    switch (tab) {
      case "inks": return inks;
      case "plates": return plates;
      case "pads": return pads;
      case "base_colors": return baseColors;
      case "white_refs": return whiteRefs;
    }
  };

  const getEmptyForm = (): any => {
    switch (tab) {
      case "inks":
        return { ink_name: "", ink_type: "color_ink", solid_L_SCI: "", solid_a_SCI: "", solid_b_SCI: "", solid_L_SCE: "", solid_a_SCE: "", solid_b_SCE: "", gloss_GU: "", manufacturer: "", memo: "" };
      case "plates":
        return { plate_code: "", plate_name: "", etch_depth: "", depth_measurement_density: "", screen_ruling: "", dot_density: "", condition: "", linked_pattern: "", memo: "" };
      case "pads":
        return { pad_code: "", hardness: "", condition: "", tags: "", memo: "" };
      case "base_colors":
        return { base_color_name: "", L_SCI: "", a_SCI: "", b_SCI: "", L_SCE: "", a_SCE: "", b_SCE: "", gloss_GU: "", paint_manufacturer: "", linked_pattern: "", memo: "" };
      case "white_refs":
        return { ref_name: "", customer: "", L_SCI: "", a_SCI: "", b_SCI: "", L_SCE: "", a_SCE: "", b_SCE: "", led_info: "", memo: "" };
    }
  };

  const openNewForm = () => {
    setEditingId(null);
    setForm(getEmptyForm());
    setShowForm(true);
  };

  const openEditForm = (item: any) => {
    setEditingId(item[tabConfig[tab].idField]);
    const f: any = {};
    const empty = getEmptyForm();
    for (const key of Object.keys(empty)) {
      f[key] = item[key] ?? "";
    }
    setForm(f);
    setShowForm(true);
  };

  const saveForm = async () => {
    const { endpoint, idField } = tabConfig[tab];
    const payload: any = {};
    for (const [key, value] of Object.entries(form)) {
      if (value === "") {
        payload[key] = null;
      } else if (typeof value === "string" && !isNaN(Number(value)) && key !== "ink_name" && key !== "ink_type" && key !== "plate_code" && key !== "plate_name" && key !== "pad_code" && key !== "condition" && key !== "tags" && key !== "manufacturer" && key !== "memo" && key !== "base_color_name" && key !== "paint_manufacturer" && key !== "linked_pattern" && key !== "ref_name" && key !== "customer" && key !== "led_info") {
        payload[key] = Number(value);
      } else {
        payload[key] = value;
      }
    }

    try {
      if (editingId) {
        await api.put(`${endpoint}/${editingId}`, payload);
      } else {
        await api.post(`${endpoint}/`, payload);
      }
      setShowForm(false);
      setEditingId(null);
      fetchAll();
    } catch (err) {
      console.error("저장 실패:", err);
      alert("저장에 실패했습니다.");
    }
  };

  const deleteItem = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const { endpoint } = tabConfig[tab];
    try {
      await api.delete(`${endpoint}/${id}`);
      fetchAll();
    } catch (err) {
      console.error("삭제 실패:", err);
    }
  };

  const renderTable = () => {
    const data = getData();
    if (data.length === 0) {
      return <p className="text-center text-gray-400 py-10">등록된 데이터가 없습니다.</p>;
    }

    switch (tab) {
      case "inks":
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">컬러</th>
                  <th className="px-3 py-2 text-left">잉크명</th>
                  <th className="px-3 py-2 text-left">타입</th>
                  <th className="px-3 py-2 text-right">L*(SCI)</th>
                  <th className="px-3 py-2 text-right">a*(SCI)</th>
                  <th className="px-3 py-2 text-right">b*(SCI)</th>
                  <th className="px-3 py-2 text-right">ΔE(SCI-SCE)</th>
                  <th className="px-3 py-2 text-left">제조사</th>
                  <th className="px-3 py-2 text-center">관리</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item: any) => (
                  <tr key={item.ink_id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">
                      {item.solid_L_SCI != null && (
                        <div
                          className="w-8 h-8 rounded border border-gray-300"
                          style={{ backgroundColor: labToRgb(item.solid_L_SCI, item.solid_a_SCI, item.solid_b_SCI) }}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium">{item.ink_name}</td>
                    <td className="px-3 py-2 text-gray-500">{item.ink_type}</td>
                    <td className="px-3 py-2 text-right">{item.solid_L_SCI}</td>
                    <td className="px-3 py-2 text-right">{item.solid_a_SCI}</td>
                    <td className="px-3 py-2 text-right">{item.solid_b_SCI}</td>
                    <td className="px-3 py-2 text-right">{item.delta_SCI_SCE ?? "-"}</td>
                    <td className="px-3 py-2 text-gray-500">{item.manufacturer}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => openEditForm(item)} className="text-blue-500 hover:text-blue-700 text-xs mr-2">수정</button>
                      <button onClick={() => deleteItem(item.ink_id)} className="text-red-400 hover:text-red-600 text-xs">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "plates":
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">코드</th>
                  <th className="px-3 py-2 text-left">이름</th>
                  <th className="px-3 py-2 text-right">식각깊이</th>
                  <th className="px-3 py-2 text-right">스크린선수</th>
                  <th className="px-3 py-2 text-right">도트밀도</th>
                  <th className="px-3 py-2 text-left">상태</th>
                  <th className="px-3 py-2 text-left">적용패턴</th>
                  <th className="px-3 py-2 text-center">관리</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item: any) => (
                  <tr key={item.plate_id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{item.plate_code}</td>
                    <td className="px-3 py-2">{item.plate_name}</td>
                    <td className="px-3 py-2 text-right">{item.etch_depth}</td>
                    <td className="px-3 py-2 text-right">{item.screen_ruling}</td>
                    <td className="px-3 py-2 text-right">{item.dot_density}</td>
                    <td className="px-3 py-2 text-gray-500">{item.condition}</td>
                    <td className="px-3 py-2 text-gray-500">{item.linked_pattern}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => openEditForm(item)} className="text-blue-500 hover:text-blue-700 text-xs mr-2">수정</button>
                      <button onClick={() => deleteItem(item.plate_id)} className="text-red-400 hover:text-red-600 text-xs">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "pads":
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">코드</th>
                  <th className="px-3 py-2 text-right">경도</th>
                  <th className="px-3 py-2 text-left">상태</th>
                  <th className="px-3 py-2 text-left">태그</th>
                  <th className="px-3 py-2 text-left">메모</th>
                  <th className="px-3 py-2 text-center">관리</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item: any) => (
                  <tr key={item.pad_id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{item.pad_code}</td>
                    <td className="px-3 py-2 text-right">{item.hardness}</td>
                    <td className="px-3 py-2 text-gray-500">{item.condition}</td>
                    <td className="px-3 py-2 text-gray-500">{item.tags}</td>
                    <td className="px-3 py-2 text-gray-500">{item.memo}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => openEditForm(item)} className="text-blue-500 hover:text-blue-700 text-xs mr-2">수정</button>
                      <button onClick={() => deleteItem(item.pad_id)} className="text-red-400 hover:text-red-600 text-xs">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "base_colors":
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">컬러</th>
                  <th className="px-3 py-2 text-left">이름</th>
                  <th className="px-3 py-2 text-right">L*(SCI)</th>
                  <th className="px-3 py-2 text-right">a*(SCI)</th>
                  <th className="px-3 py-2 text-right">b*(SCI)</th>
                  <th className="px-3 py-2 text-right">ΔE(SCI-SCE)</th>
                  <th className="px-3 py-2 text-left">도료사</th>
                  <th className="px-3 py-2 text-left">적용패턴</th>
                  <th className="px-3 py-2 text-center">관리</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item: any) => (
                  <tr key={item.base_color_id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">
                      {item.L_SCI != null && (
                        <div
                          className="w-8 h-8 rounded border border-gray-300"
                          style={{ backgroundColor: labToRgb(item.L_SCI, item.a_SCI, item.b_SCI) }}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium">{item.base_color_name}</td>
                    <td className="px-3 py-2 text-right">{item.L_SCI}</td>
                    <td className="px-3 py-2 text-right">{item.a_SCI}</td>
                    <td className="px-3 py-2 text-right">{item.b_SCI}</td>
                    <td className="px-3 py-2 text-right">{item.delta_SCI_SCE ?? "-"}</td>
                    <td className="px-3 py-2 text-gray-500">{item.paint_manufacturer}</td>
                    <td className="px-3 py-2 text-gray-500">{item.linked_pattern}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => openEditForm(item)} className="text-blue-500 hover:text-blue-700 text-xs mr-2">수정</button>
                      <button onClick={() => deleteItem(item.base_color_id)} className="text-red-400 hover:text-red-600 text-xs">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "white_refs":
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">컬러</th>
                  <th className="px-3 py-2 text-left">이름</th>
                  <th className="px-3 py-2 text-left">고객사</th>
                  <th className="px-3 py-2 text-right">L*(SCI)</th>
                  <th className="px-3 py-2 text-right">a*(SCI)</th>
                  <th className="px-3 py-2 text-right">b*(SCI)</th>
                  <th className="px-3 py-2 text-left">LED 정보</th>
                  <th className="px-3 py-2 text-center">관리</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item: any) => (
                  <tr key={item.white_ref_id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">
                      {item.L_SCI != null && (
                        <div
                          className="w-8 h-8 rounded border border-gray-300"
                          style={{ backgroundColor: labToRgb(item.L_SCI, item.a_SCI, item.b_SCI) }}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium">{item.ref_name}</td>
                    <td className="px-3 py-2 text-gray-500">{item.customer}</td>
                    <td className="px-3 py-2 text-right">{item.L_SCI}</td>
                    <td className="px-3 py-2 text-right">{item.a_SCI}</td>
                    <td className="px-3 py-2 text-right">{item.b_SCI}</td>
                    <td className="px-3 py-2 text-gray-500">{item.led_info}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => openEditForm(item)} className="text-blue-500 hover:text-blue-700 text-xs mr-2">수정</button>
                      <button onClick={() => deleteItem(item.white_ref_id)} className="text-red-400 hover:text-red-600 text-xs">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  };

  const renderForm = () => {
    const fields = Object.keys(form);
    const labelMap: Record<string, string> = {
      ink_name: "잉크명 *", ink_type: "타입", solid_L_SCI: "L*(SCI)", solid_a_SCI: "a*(SCI)",
      solid_b_SCI: "b*(SCI)", solid_L_SCE: "L*(SCE)", solid_a_SCE: "a*(SCE)", solid_b_SCE: "b*(SCE)",
      gloss_GU: "광택(GU)", manufacturer: "제조사", memo: "메모",
      plate_code: "코드", plate_name: "이름", etch_depth: "식각깊이", depth_measurement_density: "측정밀도",
      screen_ruling: "스크린선수", dot_density: "도트밀도", condition: "상태", linked_pattern: "적용패턴",
      pad_code: "코드", hardness: "경도", tags: "태그",
      base_color_name: "이름 *", L_SCI: "L*(SCI)", a_SCI: "a*(SCI)", b_SCI: "b*(SCI)",
      L_SCE: "L*(SCE)", a_SCE: "a*(SCE)", b_SCE: "b*(SCE)", paint_manufacturer: "도료사",
      ref_name: "이름 *", customer: "고객사", led_info: "LED 정보",
    };

    // Lab 미리보기
    let previewL: number | null = null;
    let previewA: number | null = null;
    let previewB: number | null = null;

    if (tab === "inks" && form.solid_L_SCI && form.solid_a_SCI && form.solid_b_SCI) {
      previewL = Number(form.solid_L_SCI);
      previewA = Number(form.solid_a_SCI);
      previewB = Number(form.solid_b_SCI);
    } else if ((tab === "base_colors" || tab === "white_refs") && form.L_SCI && form.a_SCI && form.b_SCI) {
      previewL = Number(form.L_SCI);
      previewA = Number(form.a_SCI);
      previewB = Number(form.b_SCI);
    }

    return (
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-blue-800">
            {editingId ? `${tabConfig[tab].label} 수정` : `새 ${tabConfig[tab].label} 등록`}
          </h3>
          {previewL !== null && previewA !== null && previewB !== null && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">미리보기</span>
              <div
                className="w-10 h-10 rounded border border-gray-300"
                style={{ backgroundColor: labToRgb(previewL, previewA, previewB) }}
              />
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {fields.map((key) => (
            <div key={key}>
              <label className="block text-xs text-gray-600 mb-1">
                {labelMap[key] || key}
              </label>
              {key === "ink_type" ? (
                <select
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  <option value="color_ink">컬러잉크</option>
                  <option value="white">화이트</option>
                  <option value="clear">클리어</option>
                  <option value="metallic">메탈릭</option>
                  <option value="other">기타</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2 justify-end">
          <button
            onClick={() => { setShowForm(false); setEditingId(null); }}
            className="bg-gray-400 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-500"
          >
            취소
          </button>
          <button
            onClick={saveForm}
            className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
          >
            {editingId ? "수정 완료" : "등록"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="text-gray-500 hover:text-gray-800 text-sm"
            >
              ← 메인
            </button>
            <h1 className="text-xl font-bold text-gray-800">마스터 데이터 관리</h1>
          </div>
          <button
            onClick={openNewForm}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            + {tabConfig[tab].label} 추가
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* 탭 */}
        <div className="flex gap-1 mb-4 bg-white rounded-lg p-1 border shadow-sm">
          {(Object.keys(tabConfig) as TabType[]).map((key) => (
            <button
              key={key}
              onClick={() => { setTab(key); setShowForm(false); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                tab === key
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tabConfig[key].label}
              <span className="ml-1 text-xs opacity-70">
                ({tab === key ? getData().length : ""})
              </span>
            </button>
          ))}
        </div>

        {/* 폼 */}
        {showForm && renderForm()}

        {/* 테이블 */}
        <div className="bg-white rounded-lg border shadow-sm">
          {renderTable()}
        </div>
      </main>
    </div>
  );
}
