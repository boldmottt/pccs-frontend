"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import OpacityGauge from "@/components/OpacityGauge";
import InkDonutChart, { inkCategorySlices } from "@/components/InkDonutChart";
import TransparencySimulator from "@/components/TransparencySimulator";

function labToRgb(L: number, a: number, b: number): string {
  let y = (L + 16) / 116; let x = a / 500 + y; let z = y - b / 200;
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

interface Ink { ink_id: number; ink_name: string; ink_type?: string; ink_category?: string; effect_type?: string; is_volatile?: boolean; affects_gloss?: boolean; residue_pct?: number; avg_opacity_score?: number; measurement_count?: number; solid_L_SCI?: number; solid_a_SCI?: number; solid_b_SCI?: number; solid_L_SCE?: number; solid_a_SCE?: number; solid_b_SCE?: number; gloss_GU?: number; manufacturer?: string; delta_SCI_SCE?: number; color_index?: string; viscosity?: number; density?: number; shelf_life_months?: number; memo?: string; }
interface Plate { plate_id: number; plate_code?: string; plate_name?: string; etch_depth?: number; depth_measurement_density?: number; screen_ruling?: number; dot_density?: number; condition?: string; linked_pattern?: string; manufacturer?: string; material?: string; roller_diameter?: number; cell_volume?: number; memo?: string; }
interface Pad { pad_id: number; pad_code?: string; hardness?: number; condition?: string; pad_shape?: string; pad_material?: string; diameter_mm?: number; tags?: string; memo?: string; }
interface BaseColorType { base_color_id: number; base_color_name: string; color_code?: string; color_category?: string; paint_type?: string; thickness_um?: number; surface_type?: string; L_SCI?: number; a_SCI?: number; b_SCI?: number; L_SCE?: number; a_SCE?: number; b_SCE?: number; gloss_GU?: number; paint_manufacturer?: string; delta_SCI_SCE?: number; linked_pattern?: string; memo?: string; }
interface WhiteRef { white_ref_id: number; ref_name: string; customer?: string; L_SCI?: number; a_SCI?: number; b_SCI?: number; L_SCE?: number; a_SCE?: number; b_SCE?: number; led_info?: string; memo?: string; }
interface Recipe { recipe_id: number; recipe_name: string; ink_items?: any[]; thinner_pct?: number; hardener_pct?: number; ink_total_g?: number; thinner_g?: number; hardener_g?: number; total_weight_g?: number; result_L_SCI?: number; result_a_SCI?: number; result_b_SCI?: number; result_L_SCE?: number; result_a_SCE?: number; result_b_SCE?: number; result_delta_E?: number; linked_color_id?: number; linked_sample_id?: number; memo?: string; }

type TabType = "inks" | "plates" | "pads" | "base_colors" | "white_refs" | "recipes";

export default function MasterPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabType>("inks");
  const [inks, setInks] = useState<Ink[]>([]);
  const [plates, setPlates] = useState<Plate[]>([]);
  const [pads, setPads] = useState<Pad[]>([]);
  const [baseColors, setBaseColors] = useState<BaseColorType[]>([]);
  const [whiteRefs, setWhiteRefs] = useState<WhiteRef[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({});
  const [detailId, setDetailId] = useState<number | null>(null);

  // 필터
  const [filterText, setFilterText] = useState("");

  const tabs: { key: TabType; label: string }[] = [
    { key: "inks", label: "잉크" }, { key: "plates", label: "동판" }, { key: "pads", label: "패드" },
    { key: "base_colors", label: "베이스컬러" }, { key: "white_refs", label: "백색기준" }, { key: "recipes", label: "확정레시피" },
  ];

  const loadData = async () => {
    try {
      const [r1, r2, r3, r4, r5, r6] = await Promise.all([
        api.get("/api/inks/"), api.get("/api/plates/"), api.get("/api/pads/"),
        api.get("/api/base-colors/"), api.get("/api/white-refs/"), api.get("/api/recipes/"),
      ]);
      setInks(r1.data); setPlates(r2.data); setPads(r3.data);
      setBaseColors(r4.data); setWhiteRefs(r5.data); setRecipes(r6.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => { setForm({}); setEditId(null); setShowForm(false); };

  const openNewForm = () => {
    setEditId(null); setDetailId(null);
    if (tab === "inks") setForm({ ink_name: "", ink_type: "color_ink", ink_category: "color", effect_type: "", is_volatile: false, affects_gloss: false, residue_pct: "", manufacturer: "", color_index: "", viscosity: "", density: "", shelf_life_months: "", solid_L_SCI: "", solid_a_SCI: "", solid_b_SCI: "", solid_L_SCE: "", solid_a_SCE: "", solid_b_SCE: "", gloss_GU: "", memo: "" });
    else if (tab === "plates") setForm({ plate_code: "", plate_name: "", etch_depth: "", depth_measurement_density: "", screen_ruling: "", dot_density: "", condition: "", linked_pattern: "", manufacturer: "", material: "", roller_diameter: "", cell_volume: "", memo: "" });
    else if (tab === "pads") setForm({ pad_code: "", hardness: "", condition: "", pad_shape: "", pad_material: "", diameter_mm: "", tags: "", memo: "" });
    else if (tab === "base_colors") setForm({ base_color_name: "", color_code: "", color_category: "", paint_type: "", thickness_um: "", surface_type: "", L_SCI: "", a_SCI: "", b_SCI: "", L_SCE: "", a_SCE: "", b_SCE: "", gloss_GU: "", paint_manufacturer: "", linked_pattern: "", memo: "" });
    else if (tab === "white_refs") setForm({ ref_name: "", customer: "", L_SCI: "", a_SCI: "", b_SCI: "", L_SCE: "", a_SCE: "", b_SCE: "", led_info: "", memo: "" });
    else if (tab === "recipes") setForm({ recipe_name: "", ink_items: [], thinner_pct: "", hardener_pct: "", result_L_SCI: "", result_a_SCI: "", result_b_SCI: "", result_L_SCE: "", result_a_SCE: "", result_b_SCE: "", linked_color_id: "", linked_sample_id: "", memo: "" });
    setShowForm(true);
  };

  const openEditForm = (item: any) => {
    setDetailId(null);
    const cleaned: any = {};
    Object.keys(item).forEach(k => { cleaned[k] = item[k] === null || item[k] === undefined ? "" : item[k]; });
    setForm(cleaned); setEditId(tab === "inks" ? item.ink_id : tab === "plates" ? item.plate_id : tab === "pads" ? item.pad_id : tab === "base_colors" ? item.base_color_id : tab === "white_refs" ? item.white_ref_id : item.recipe_id);
    setShowForm(true);
  };

  const handleSave = async () => {
    const endpoint = tab === "inks" ? "/api/inks/" : tab === "plates" ? "/api/plates/" : tab === "pads" ? "/api/pads/" : tab === "base_colors" ? "/api/base-colors/" : tab === "white_refs" ? "/api/white-refs/" : "/api/recipes/";
    const payload: any = {};
    Object.keys(form).forEach(k => {
      if (["registered_at", "updated_at", "delta_SCI_SCE", "ink_id", "plate_id", "pad_id", "base_color_id", "white_ref_id", "recipe_id", "ink_total_g", "thinner_g", "hardener_g", "total_weight_g", "result_delta_E", "avg_opacity_score", "measurement_count"].includes(k)) return;
      const v = form[k];
      if (v === "" || v === undefined) { payload[k] = null; return; }
      if (["is_volatile","affects_gloss"].includes(k)) { payload[k] = Boolean(v); return; }
      if (["solid_L_SCI","solid_a_SCI","solid_b_SCI","solid_L_SCE","solid_a_SCE","solid_b_SCE","gloss_GU","viscosity","density","residue_pct","etch_depth","depth_measurement_density","screen_ruling","dot_density","roller_diameter","cell_volume","hardness","diameter_mm","L_SCI","a_SCI","b_SCI","L_SCE","a_SCE","b_SCE","thickness_um","thinner_pct","hardener_pct","result_L_SCI","result_a_SCI","result_b_SCI","result_L_SCE","result_a_SCE","result_b_SCE"].includes(k)) {
        payload[k] = v === null ? null : parseFloat(v);
      } else if (["shelf_life_months","linked_color_id","linked_sample_id"].includes(k)) {
        payload[k] = v === null ? null : parseInt(v);
      } else { payload[k] = v; }
    });
    try {
      if (editId) await api.put(`${endpoint}${editId}`, payload);
      else await api.post(endpoint, payload);
      resetForm(); loadData();
    } catch (e: any) { alert("저장 실패: " + (e.response?.data?.detail || e.message)); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const endpoint = tab === "inks" ? "/api/inks/" : tab === "plates" ? "/api/plates/" : tab === "pads" ? "/api/pads/" : tab === "base_colors" ? "/api/base-colors/" : tab === "white_refs" ? "/api/white-refs/" : "/api/recipes/";
    try { await api.delete(`${endpoint}${id}`); loadData(); if (detailId === id) setDetailId(null); }
    catch (e: any) { alert("삭제 실패: " + (e.response?.data?.detail || e.message)); }
  };

  const renderField = (label: string, key: string, type: string = "text", placeholder?: string) => (
    <div key={key} style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 2 }}>{label}</label>
      {type === "textarea" ? (
        <textarea value={form[key] || ""} onChange={e => setForm({ ...form, [key]: e.target.value })} style={{ width: "100%", padding: 6, border: "1px solid #ddd", borderRadius: 4, fontSize: 13, minHeight: 60 }} placeholder={placeholder} />
      ) : type === "select" ? (
        <select value={form[key] || ""} onChange={e => setForm({ ...form, [key]: e.target.value })} style={{ width: "100%", padding: 6, border: "1px solid #ddd", borderRadius: 4, fontSize: 13 }}>
          {placeholder?.split(",").map(o => <option key={o} value={o}>{o || "선택"}</option>)}
        </select>
      ) : (
        <input type={type} value={form[key] ?? ""} onChange={e => setForm({ ...form, [key]: e.target.value })} style={{ width: "100%", padding: 6, border: "1px solid #ddd", borderRadius: 4, fontSize: 13 }} placeholder={placeholder} />
      )}
    </div>
  );

  const LabBox = ({ L, a, b, label }: { L?: number; a?: number; b?: number; label: string }) => {
    if (L == null || a == null || b == null) return null;
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginRight: 12 }}>
        <div style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #ccc", background: labToRgb(L, a, b) }} />
        <span style={{ fontSize: 11, color: "#666" }}>{label} L={L} a={a} b={b}</span>
      </div>
    );
  };

  // ============ 필터 적용 ============
  const filterItems = (items: any[]): any[] => {
    if (!filterText.trim()) return items;
    const q = filterText.toLowerCase();
    return items.filter(item => JSON.stringify(item).toLowerCase().includes(q));
  };

  // ============ 폼 렌더링 ============
  const renderForm = () => {
    if (!showForm) return null;
    return (
      <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{editId ? "수정" : "신규 등록"}</h3>

        {tab === "inks" && (<>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {renderField("잉크명 *", "ink_name")}
            <div key="ink_category" style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 2 }}>카테고리</label>
              <select value={form.ink_category || "color"} onChange={e => setForm({ ...form, ink_category: e.target.value })} style={{ width: "100%", padding: 6, border: "1px solid #ddd", borderRadius: 4, fontSize: 13 }}>
                <option value="color">칼라</option>
                <option value="transparent">희석제</option>
                <option value="effect">이펙트</option>
                <option value="additive">첨가제</option>
              </select>
            </div>
            {renderField("제조사", "manufacturer")}{renderField("CI번호", "color_index")}
            {renderField("점도", "viscosity", "number")}{renderField("비중", "density", "number")}
            {renderField("유효기간(월)", "shelf_life_months", "number")}{renderField("광택(GU)", "gloss_GU", "number")}
            {form.ink_category === "effect" && renderField("이펙트 종류", "effect_type", "select", ",metallic,pearlescent,glitter,fluorescent,기타")}
            {renderField("잔류물(%)", "residue_pct", "number")}
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
            <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
              <input type="checkbox" checked={!!form.is_volatile} onChange={e => setForm({ ...form, is_volatile: e.target.checked })} /> 휘발성
            </label>
            <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
              <input type="checkbox" checked={!!form.affects_gloss} onChange={e => setForm({ ...form, affects_gloss: e.target.checked })} /> 광택영향
            </label>
          </div>
          <div style={{ marginTop: 8, padding: 8, background: "#f8f9fa", borderRadius: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>SCI 측정값 (솔리드)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {renderField("L*", "solid_L_SCI", "number")}{renderField("a*", "solid_a_SCI", "number")}{renderField("b*", "solid_b_SCI", "number")}
            </div>
          </div>
          <div style={{ marginTop: 8, padding: 8, background: "#f0f4f8", borderRadius: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>SCE 측정값</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {renderField("L*", "solid_L_SCE", "number")}{renderField("a*", "solid_a_SCE", "number")}{renderField("b*", "solid_b_SCE", "number")}
            </div>
          </div>
          {renderField("메모", "memo", "textarea")}
        </>)}

        {tab === "plates" && (<>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {renderField("동판코드", "plate_code")}{renderField("동판명", "plate_name")}
            {renderField("제조사", "manufacturer")}{renderField("재질", "material", "select", ",수지,스틸,물동판")}
            {renderField("식각심도(μm)", "etch_depth", "number")}{renderField("심도측정농도(%)", "depth_measurement_density", "number")}
            {renderField("스크린선수(LPI)", "screen_ruling", "number")}{renderField("망점농도(%)", "dot_density", "number")}
            {renderField("롤러직경(mm)", "roller_diameter", "number")}{renderField("셀용적(ml/m²)", "cell_volume", "number")}
            {renderField("상태", "condition", "select", ",양호,마모,교체필요")}{renderField("적용패턴", "linked_pattern")}
          </div>
          {renderField("메모", "memo", "textarea")}
        </>)}

        {tab === "pads" && (<>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {renderField("패드코드", "pad_code")}{renderField("경도(Shore A)", "hardness", "number")}
            {renderField("형상", "pad_shape", "select", ",원형,사각,특수형")}{renderField("재질", "pad_material", "select", ",실리콘,우레탄")}
            {renderField("직경(mm)", "diameter_mm", "number")}{renderField("상태", "condition", "select", ",양호,마모,교체필요")}
            {renderField("태그", "tags")}
          </div>
          {renderField("메모", "memo", "textarea")}
        </>)}

        {tab === "base_colors" && (<>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {renderField("베이스컬러명 *", "base_color_name")}{renderField("색상코드", "color_code")}
            {renderField("색상계열", "color_category", "select", ",화이트,블랙,실버,그레이,레드,블루,그린,옐로우,오렌지,퍼플,베이지,브라운,골드,기타")}
            {renderField("도료종류", "paint_type", "select", ",수성,유성,UV,분체,기타")}
            {renderField("도막두께(μm)", "thickness_um", "number")}{renderField("표면유형", "surface_type", "select", ",유광,무광,반무광,펄,메탈릭,기타")}
            {renderField("도료제조사", "paint_manufacturer")}{renderField("광택(GU)", "gloss_GU", "number")}
          </div>
          <div style={{ marginTop: 8, padding: 8, background: "#f8f9fa", borderRadius: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>SCI 측정값</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {renderField("L*", "L_SCI", "number")}{renderField("a*", "a_SCI", "number")}{renderField("b*", "b_SCI", "number")}
            </div>
          </div>
          <div style={{ marginTop: 8, padding: 8, background: "#f0f4f8", borderRadius: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>SCE 측정값</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {renderField("L*", "L_SCE", "number")}{renderField("a*", "a_SCE", "number")}{renderField("b*", "b_SCE", "number")}
            </div>
          </div>
          {renderField("적용패턴(연동)", "linked_pattern")}{renderField("메모", "memo", "textarea")}
        </>)}

        {tab === "white_refs" && (<>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {renderField("기준명 *", "ref_name")}{renderField("고객사", "customer")}{renderField("LED 정보", "led_info")}
          </div>
          <div style={{ marginTop: 8, padding: 8, background: "#f8f9fa", borderRadius: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>SCI 측정값</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {renderField("L*", "L_SCI", "number")}{renderField("a*", "a_SCI", "number")}{renderField("b*", "b_SCI", "number")}
            </div>
          </div>
          <div style={{ marginTop: 8, padding: 8, background: "#f0f4f8", borderRadius: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>SCE 측정값</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {renderField("L*", "L_SCE", "number")}{renderField("a*", "a_SCE", "number")}{renderField("b*", "b_SCE", "number")}
            </div>
          </div>
          {renderField("메모", "memo", "textarea")}
        </>)}

        {tab === "recipes" && (<>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {renderField("레시피명 *", "recipe_name")}{renderField("시너비율(%)", "thinner_pct", "number")}
            {renderField("경화제비율(%)", "hardener_pct", "number")}{renderField("연결 컬러ID", "linked_color_id", "number")}
            {renderField("연결 샘플ID", "linked_sample_id", "number")}
          </div>
          <div style={{ marginTop: 8, padding: 8, background: "#f8f9fa", borderRadius: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>결과 SCI Lab</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {renderField("L*", "result_L_SCI", "number")}{renderField("a*", "result_a_SCI", "number")}{renderField("b*", "result_b_SCI", "number")}
            </div>
          </div>
          <div style={{ marginTop: 8, padding: 8, background: "#f0f4f8", borderRadius: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>결과 SCE Lab</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {renderField("L*", "result_L_SCE", "number")}{renderField("a*", "result_a_SCE", "number")}{renderField("b*", "result_b_SCE", "number")}
            </div>
          </div>
          {renderField("메모", "memo", "textarea")}
        </>)}

        {(form.solid_L_SCI || form.L_SCI || form.result_L_SCI) && (
          <div style={{ marginTop: 8 }}>
            <LabBox L={parseFloat(form.solid_L_SCI || form.L_SCI || form.result_L_SCI)} a={parseFloat(form.solid_a_SCI || form.a_SCI || form.result_a_SCI)} b={parseFloat(form.solid_b_SCI || form.b_SCI || form.result_b_SCI)} label="SCI" />
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={handleSave} style={{ padding: "8px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>{editId ? "수정 완료" : "등록"}</button>
          <button onClick={resetForm} style={{ padding: "8px 20px", background: "#e5e7eb", border: "none", borderRadius: 6, cursor: "pointer" }}>취소</button>
        </div>
      </div>
    );
  };

  // ============ 확정레시피 상세보기 ============
  const renderRecipeDetail = (item: Recipe) => (
    <div style={{ background: "#fff", border: "1px solid #2563eb", borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600 }}>{item.recipe_name} — 상세 정보</h3>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => openEditForm(item)} style={{ padding: "4px 12px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>수정</button>
          <button onClick={() => setDetailId(null)} style={{ padding: "4px 12px", background: "#e5e7eb", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>닫기</button>
        </div>
      </div>

      {/* 잉크 배합비 */}
      {item.ink_items && item.ink_items.length > 0 && (
        <div style={{ marginBottom: 12, padding: 12, background: "#fefce8", borderRadius: 6, border: "1px solid #fde68a" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#92400e" }}>확정 배합비</div>
          {item.ink_items.map((ink: any, i: number) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: i < item.ink_items!.length - 1 ? "1px solid #fde68a" : "none" }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{ink.ink_name}</span>
              <span style={{ fontSize: 13, color: "#92400e", fontWeight: 600 }}>{ink.weight_g}g</span>
            </div>
          ))}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #fde68a", display: "flex", gap: 16, fontSize: 12, color: "#666" }}>
            {item.ink_total_g != null && <span>잉크합계: <b>{item.ink_total_g}g</b></span>}
            {item.thinner_pct != null && <span>시너: <b>{item.thinner_pct}%</b>{item.thinner_g != null && ` (${item.thinner_g}g)`}</span>}
            {item.hardener_pct != null && <span>경화제: <b>{item.hardener_pct}%</b>{item.hardener_g != null && ` (${item.hardener_g}g)`}</span>}
            {item.total_weight_g != null && <span>총중량: <b>{item.total_weight_g}g</b></span>}
          </div>
        </div>
      )}

      {/* 결과 컬러값 */}
      {(item.result_L_SCI != null || item.result_L_SCE != null) && (
        <div style={{ marginBottom: 12, padding: 12, background: "#f0fdf4", borderRadius: 6, border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#166534" }}>결과 컬러값</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
            {item.result_L_SCI != null && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 6, border: "1px solid #ccc", background: labToRgb(item.result_L_SCI!, item.result_a_SCI!, item.result_b_SCI!) }} />
                <div>
                  <div style={{ fontSize: 11, color: "#999" }}>SCI</div>
                  <div style={{ fontSize: 12 }}>L={item.result_L_SCI} a={item.result_a_SCI} b={item.result_b_SCI}</div>
                </div>
              </div>
            )}
            {item.result_L_SCE != null && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 6, border: "1px solid #ccc", background: labToRgb(item.result_L_SCE!, item.result_a_SCE!, item.result_b_SCE!) }} />
                <div>
                  <div style={{ fontSize: 11, color: "#999" }}>SCE</div>
                  <div style={{ fontSize: 12 }}>L={item.result_L_SCE} a={item.result_a_SCE} b={item.result_b_SCE}</div>
                </div>
              </div>
            )}
            {item.result_delta_E != null && (
              <div style={{ fontSize: 14, fontWeight: 700, color: item.result_delta_E < 1 ? "#10b981" : item.result_delta_E < 3 ? "#3b82f6" : item.result_delta_E < 6 ? "#f59e0b" : "#ef4444" }}>
                ΔE = {item.result_delta_E}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 기타 정보 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 12 }}>
        {item.linked_color_id != null && <div><span style={{ color: "#999" }}>연결 컬러ID:</span> {item.linked_color_id}</div>}
        {item.linked_sample_id != null && <div><span style={{ color: "#999" }}>연결 샘플ID:</span> {item.linked_sample_id}</div>}
        {item.memo && <div style={{ gridColumn: "1 / -1" }}><span style={{ color: "#999" }}>메모:</span> {item.memo}</div>}
      </div>
    </div>
  );

  const CATEGORY_LABELS: Record<string, string> = { color: "칼라", transparent: "희석제", effect: "이펙트", additive: "첨가제" };
  const CATEGORY_COLORS: Record<string, string> = { color: "#3b82f6", transparent: "#10b981", effect: "#8b5cf6", additive: "#f59e0b" };

  // ============ 일반 상세보기 ============
  const renderDetail = () => {
    if (detailId === null) return null;
    let item: any = null;
    if (tab === "inks") item = inks.find(i => i.ink_id === detailId);
    else if (tab === "plates") item = plates.find(i => i.plate_id === detailId);
    else if (tab === "pads") item = pads.find(i => i.pad_id === detailId);
    else if (tab === "base_colors") item = baseColors.find(i => i.base_color_id === detailId);
    else if (tab === "white_refs") item = whiteRefs.find(i => i.white_ref_id === detailId);
    else if (tab === "recipes") item = recipes.find(i => i.recipe_id === detailId);
    if (!item) return null;

    if (tab === "recipes") return renderRecipeDetail(item);

    return (
      <div style={{ background: "#fff", border: "1px solid #2563eb", borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>상세 정보</h3>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => openEditForm(item)} style={{ padding: "4px 12px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>수정</button>
            <button onClick={() => setDetailId(null)} style={{ padding: "4px 12px", background: "#e5e7eb", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>닫기</button>
          </div>
        </div>

        {/* 잉크 v5 시각화 */}
        {tab === "inks" && (
          <div style={{ marginBottom: 12, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
            {item.avg_opacity_score != null || item.measurement_count > 0 ? (
              <OpacityGauge score={item.avg_opacity_score} size={110} label="은폐력" />
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>은폐력</div>
                <div style={{ fontSize: 12, color: "#d1d5db" }}>측정 없음</div>
              </div>
            )}
            {item.solid_L_SCI != null && (
              <TransparencySimulator inkL={item.solid_L_SCI} inkA={item.solid_a_SCI ?? 0} inkB={item.solid_b_SCI ?? 0} opacityScore={item.avg_opacity_score ?? 80} showSlider label="투명도 시뮬레이션" />
            )}
          </div>
        )}

        {(item.solid_L_SCI != null || item.L_SCI != null) && (
          <div style={{ marginBottom: 12, padding: 10, background: "#f8f9fa", borderRadius: 6 }}>
            <LabBox L={item.solid_L_SCI ?? item.L_SCI} a={item.solid_a_SCI ?? item.a_SCI} b={item.solid_b_SCI ?? item.b_SCI} label="SCI" />
            <LabBox L={item.solid_L_SCE ?? item.L_SCE} a={item.solid_a_SCE ?? item.a_SCE} b={item.solid_b_SCE ?? item.b_SCE} label="SCE" />
            {item.delta_SCI_SCE != null && <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>ΔE(SCI-SCE) = {item.delta_SCI_SCE}</span>}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          {Object.entries(item).map(([k, v]) => {
            if (["registered_at", "updated_at"].includes(k) && v) return <div key={k} style={{ fontSize: 12, padding: "2px 0" }}><span style={{ color: "#999" }}>{k}:</span> {new Date(v as string).toLocaleString("ko-KR")}</div>;
            if (v === null || v === undefined) return null;
            return <div key={k} style={{ fontSize: 12, padding: "2px 0" }}><span style={{ color: "#999" }}>{k}:</span> {String(v)}</div>;
          })}
        </div>
      </div>
    );
  };

  // ============ 목록 렌더링 ============
  const renderList = () => {
    const getRawItems = (): any[] => {
      if (tab === "inks") return inks; if (tab === "plates") return plates; if (tab === "pads") return pads;
      if (tab === "base_colors") return baseColors; if (tab === "white_refs") return whiteRefs; return recipes;
    };
    const items = filterItems(getRawItems());
    if (items.length === 0) return <div style={{ textAlign: "center", padding: 40, color: "#999" }}>{filterText ? "검색 결과가 없습니다" : "등록된 데이터가 없습니다"}</div>;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item) => {
          const id = item.ink_id || item.plate_id || item.pad_id || item.base_color_id || item.white_ref_id || item.recipe_id;
          const name = item.ink_name || item.plate_name || item.plate_code || item.pad_code || item.base_color_name || item.ref_name || item.recipe_name || `#${id}`;
          let sub = "";
          if (tab === "inks") sub = [CATEGORY_LABELS[item.ink_category] || item.ink_category, item.manufacturer, item.color_index && `CI: ${item.color_index}`, item.avg_opacity_score != null && `은폐력 ${item.avg_opacity_score.toFixed(0)}%`].filter(Boolean).join(" · ");
          else if (tab === "plates") sub = [item.manufacturer, item.material, item.etch_depth && `심도: ${item.etch_depth}μm`, item.screen_ruling && `${item.screen_ruling}LPI`].filter(Boolean).join(" · ");
          else if (tab === "pads") sub = [item.hardness && `경도: ${item.hardness}`, item.pad_shape, item.pad_material, item.diameter_mm && `Ø${item.diameter_mm}mm`].filter(Boolean).join(" · ");
          else if (tab === "base_colors") sub = [item.color_code, item.color_category, item.paint_type, item.surface_type, item.paint_manufacturer].filter(Boolean).join(" · ");
          else if (tab === "white_refs") sub = [item.customer, item.led_info].filter(Boolean).join(" · ");
          else if (tab === "recipes") {
            const parts = [];
            if (item.ink_items?.length) parts.push(`잉크 ${item.ink_items.length}종`);
            if (item.thinner_pct) parts.push(`시너 ${item.thinner_pct}%`);
            if (item.hardener_pct) parts.push(`경화제 ${item.hardener_pct}%`);
            if (item.total_weight_g) parts.push(`총 ${item.total_weight_g}g`);
            if (item.result_delta_E != null) parts.push(`ΔE: ${item.result_delta_E}`);
            sub = parts.join(" · ");
          }

          const hasLab = (item.solid_L_SCI != null || item.L_SCI != null || item.result_L_SCI != null);
          const labL = item.solid_L_SCI ?? item.L_SCI ?? item.result_L_SCI;
          const labA = item.solid_a_SCI ?? item.a_SCI ?? item.result_a_SCI;
          const labB = item.solid_b_SCI ?? item.b_SCI ?? item.result_b_SCI;

          return (
            <div key={id} onClick={() => setDetailId(detailId === id ? null : id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: detailId === id ? "#eff6ff" : "#fff", border: detailId === id ? "1px solid #2563eb" : "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer", transition: "all 0.15s" }}>
              {hasLab && labL != null && labA != null && labB != null && (
                <div style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #ccc", background: labToRgb(labL, labA, labB), flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
                {sub && <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>{sub}</div>}
              </div>
              {(item.delta_SCI_SCE != null || item.result_delta_E != null) && (
                <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, whiteSpace: "nowrap" }}>ΔE {item.delta_SCI_SCE ?? item.result_delta_E}</span>
              )}
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => openEditForm(item)} style={{ padding: "3px 8px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 4, fontSize: 11, cursor: "pointer" }}>수정</button>
                <button onClick={() => handleDelete(id)} style={{ padding: "3px 8px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 4, fontSize: 11, cursor: "pointer" }}>삭제</button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>마스터 데이터 관리</h1>
        <button onClick={() => router.push("/")} style={{ padding: "6px 16px", background: "#6b7280", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>← 메인</button>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); resetForm(); setDetailId(null); setFilterText(""); }}
            style={{ padding: "8px 16px", background: tab === t.key ? "#2563eb" : "#e5e7eb", color: tab === t.key ? "#fff" : "#333", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: tab === t.key ? 700 : 400 }}>
            {t.label} ({t.key === "inks" ? inks.length : t.key === "plates" ? plates.length : t.key === "pads" ? pads.length : t.key === "base_colors" ? baseColors.length : t.key === "white_refs" ? whiteRefs.length : recipes.length})
          </button>
        ))}
      </div>

      {/* 필터 + 신규등록 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <input type="text" value={filterText} onChange={e => setFilterText(e.target.value)}
          placeholder={`${tabs.find(t => t.key === tab)?.label || ""} 검색...`}
          style={{ flex: 1, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }} />
        {filterText && <button onClick={() => setFilterText("")} style={{ padding: "8px 12px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>초기화</button>}
        <button onClick={openNewForm} style={{ padding: "8px 20px", background: "#10b981", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>+ 신규 등록</button>
      </div>

      {renderForm()}
      {renderDetail()}
      {tab === "inks" && !filterText && inks.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <InkDonutChart data={inkCategorySlices(inks.map(i => ({ ink_category: i.ink_category ?? "color" })))} title="잉크 구성" />
        </div>
      )}
      {renderList()}
    </div>
  );
}
