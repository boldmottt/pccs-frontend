"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface Group { group_id: number; group_name: string; sort_order: number; }
interface Color { color_id: number; group_id: number | null; color_name: string; mode: string; customer: string | null; product: string | null; status: string; dev_stage: string | null; manager: string | null; }
interface NewColor { group_id: number | null; color_name: string; mode: string; customer: string; product: string; paint_shop: string; dev_stage: string; manager: string; }
interface SearchResult { type: string; id: number; name: string; sub: string; }

const emptyColor: NewColor = { group_id: null, color_name: "", mode: "matching", customer: "", product: "", paint_shop: "", dev_stage: "", manager: "" };

export default function HomePage() {
 const router = useRouter();
 const [groups, setGroups] = useState<Group[]>([]);
 const [colors, setColors] = useState<Color[]>([]);
 const [openGroupIds, setOpenGroupIds] = useState<Set<number>>(new Set());
 const [newGroupName, setNewGroupName] = useState("");
 const [showGroupInput, setShowGroupInput] = useState(false);
 const [showColorForm, setShowColorForm] = useState<number | null>(null);
 const [newColor, setNewColor] = useState<NewColor>({ ...emptyColor });
 const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
 const [editGroupName, setEditGroupName] = useState("");

 // 검색
 const [searchQuery, setSearchQuery] = useState("");
 const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
 const [showSearchResults, setShowSearchResults] = useState(false);
 const [searchLoading, setSearchLoading] = useState(false);
 const searchRef = useRef<HTMLDivElement>(null);
 const searchTimer = useRef<NodeJS.Timeout | null>(null);

 // 필터
 const [filterStatus, setFilterStatus] = useState<string>("all");
 const [filterCustomer, setFilterCustomer] = useState<string>("all");
 const [filterManager, setFilterManager] = useState<string>("all");

 useEffect(() => { fetchData(); }, []);

 // 검색창 밖 클릭 시 닫기
 useEffect(() => {
 const handleClick = (e: MouseEvent) => {
 if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearchResults(false);
 };
 document.addEventListener("mousedown", handleClick);
 return () => document.removeEventListener("mousedown", handleClick);
 }, []);

 const fetchData = async () => {
 try {
 const [gRes, cRes] = await Promise.all([api.get("/api/groups/"), api.get("/api/colors/")]);
 setGroups(gRes.data); setColors(cRes.data);
 } catch (err) { console.error("데이터 로드 실패:", err); }
 };

 // 검색
 const handleSearch = (q: string) => {
 setSearchQuery(q);
 if (searchTimer.current) clearTimeout(searchTimer.current);
 if (!q.trim()) { setSearchResults([]); setShowSearchResults(false); return; }
 searchTimer.current = setTimeout(async () => {
 setSearchLoading(true);
 try {
 const res = await api.get(`/api/search/all?q=${encodeURIComponent(q)}`);
 setSearchResults(res.data.results); setShowSearchResults(true);
 } catch (err) { console.error(err); }
 setSearchLoading(false);
 }, 300);
 };

 const handleSearchSelect = (result: SearchResult) => {
 setShowSearchResults(false); setSearchQuery("");
 if (result.type === "color") router.push(`/colors/${result.id}`);
 else router.push("/master");
 };

 const typeLabel = (t: string) => {
 switch (t) { case "ink": return "🎨 잉크"; case "plate": return "🔧 동판"; case "pad": return "📦 패드"; case "base_color": return "🎯 베이스컬러"; case "color": return "🔵 컬러"; default: return t; }
 };

 // 필터 옵션 추출
 const customers = [...new Set(colors.map(c => c.customer).filter(Boolean))] as string[];
 const managers = [...new Set(colors.map(c => c.manager).filter(Boolean))] as string[];

 // 필터 적용
 const filterColor = (c: Color) => {
 if (filterStatus !== "all" && c.status !== filterStatus) return false;
 if (filterCustomer !== "all" && c.customer !== filterCustomer) return false;
 if (filterManager !== "all" && c.manager !== filterManager) return false;
 return true;
 };

 const toggleGroup = (groupId: number) => { setOpenGroupIds((prev) => { const next = new Set(prev); if (next.has(groupId)) next.delete(groupId); else next.add(groupId); return next; }); };
 const createGroup = async () => { if (!newGroupName.trim()) return; try { await api.post("/api/groups/", { group_name: newGroupName.trim(), sort_order: groups.length }); setNewGroupName(""); setShowGroupInput(false); fetchData(); } catch (err) { console.error(err); } };
 const startEditGroup = (group: Group) => { setEditingGroupId(group.group_id); setEditGroupName(group.group_name); };
 const saveEditGroup = async (groupId: number) => { if (!editGroupName.trim()) return; try { await api.put(`/api/groups/${groupId}`, { group_name: editGroupName.trim(), sort_order: groups.find((g) => g.group_id === groupId)?.sort_order || 0 }); setEditingGroupId(null); fetchData(); } catch (err) { console.error(err); } };
 const deleteGroup = async (groupId: number) => { const gc = colors.filter((c) => c.group_id === groupId); if (!confirm(gc.length > 0 ? `컬러 ${gc.length}건이 있습니다. 삭제하시겠습니까?` : "삭제하시겠습니까?")) return; try { await api.delete(`/api/groups/${groupId}`); fetchData(); } catch (err) { console.error(err); } };
 const openColorForm = (groupId: number) => { setNewColor({ ...emptyColor, group_id: groupId }); setShowColorForm(groupId); if (!openGroupIds.has(groupId)) setOpenGroupIds((prev) => new Set(prev).add(groupId)); };
 const createColor = async () => { if (!newColor.color_name.trim()) { alert("컬러 이름을 입력해주세요."); return; } try { await api.post("/api/colors/", newColor); setShowColorForm(null); setNewColor({ ...emptyColor }); fetchData(); } catch (err) { console.error(err); } };
 const deleteColor = async (colorId: number) => { if (!confirm("삭제하시겠습니까?")) return; try { await api.delete(`/api/colors/${colorId}`); fetchData(); } catch (err) { console.error(err); } };
 const getColorsForGroup = (groupId: number) => colors.filter((c) => c.group_id === groupId && filterColor(c));
 const ungroupedColors = colors.filter((c) => c.group_id === null && filterColor(c));
 const statusLabel = (s: string) => { switch (s) { case "confirmed": return "✅ 확정"; case "in_progress": return "🔄 진행중"; case "hold": return "⏸ 보류"; default: return s; } };
 const hasActiveFilter = filterStatus !== "all" || filterCustomer !== "all" || filterManager !== "all";
 const filteredTotal = colors.filter(filterColor).length;

 return (
 <div className="min-h-screen bg-gray-50">
 <header className="bg-white shadow-sm border-b">
 <div className="max-w-5xl mx-auto px-4 py-4">
 <div className="flex justify-between items-center">
 <h1 className="text-xl font-bold text-gray-800">PCCS <span className="text-sm font-normal text-gray-500">v2.3</span></h1>
 <div className="flex gap-2">
 <button onClick={() => router.push("/dashboard")} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700">대시보드</button>
 <button onClick={() => router.push("/complementary")} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">보색 추출</button>
 <button onClick={() => router.push("/master")} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700">마스터 관리</button>
 <button onClick={() => setShowGroupInput(!showGroupInput)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">+ 그룹 추가</button>
 </div>
 </div>

 {/* 통합 검색바 */}
 <div ref={searchRef} className="mt-3 relative">
 <input type="text" value={searchQuery} onChange={e => handleSearch(e.target.value)} onFocus={() => { if (searchResults.length > 0) setShowSearchResults(true); }}
 placeholder="검색 — 잉크, 동판, 패드, 베이스컬러, 컬러 통합 검색..."
 className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
 {searchLoading && <span className="absolute right-3 top-3 text-xs text-gray-400">검색중...</span>}

 {showSearchResults && searchResults.length > 0 && (
 <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
 {searchResults.map((r, i) => (
 <div key={`${r.type}-${r.id}-${i}`} onClick={() => handleSearchSelect(r)}
 className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0 flex items-center gap-3">
 <span className="text-sm">{typeLabel(r.type)}</span>
 <div className="flex-1 min-w-0">
 <div className="text-sm font-medium text-gray-800 truncate">{r.name}</div>
 {r.sub && <div className="text-xs text-gray-500 truncate">{r.sub}</div>}
 </div>
 </div>
 ))}
 </div>
 )}
 {showSearchResults && searchResults.length === 0 && searchQuery.trim() && !searchLoading && (
 <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 px-4 py-3 text-sm text-gray-500">검색 결과가 없습니다</div>
 )}
 </div>

 {/* 필터 */}
 <div className="mt-3 flex gap-3 items-center flex-wrap">
 <span className="text-xs text-gray-500 font-medium">필터:</span>
 <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded-lg px-2 py-1 text-xs">
 <option value="all">상태: 전체</option>
 <option value="in_progress">🔄 진행중</option>
 <option value="confirmed">✅ 확정</option>
 <option value="hold">⏸ 보류</option>
 </select>
 {customers.length > 0 && (
 <select value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} className="border rounded-lg px-2 py-1 text-xs">
 <option value="all">고객사: 전체</option>
 {customers.map(c => <option key={c} value={c}>{c}</option>)}
 </select>
 )}
 {managers.length > 0 && (
 <select value={filterManager} onChange={e => setFilterManager(e.target.value)} className="border rounded-lg px-2 py-1 text-xs">
 <option value="all">담당자: 전체</option>
 {managers.map(m => <option key={m} value={m}>{m}</option>)}
 </select>
 )}
 {hasActiveFilter && (
 <button onClick={() => { setFilterStatus("all"); setFilterCustomer("all"); setFilterManager("all"); }} className="text-xs text-red-500 hover:text-red-700">필터 초기화</button>
 )}
 {hasActiveFilter && <span className="text-xs text-blue-600 font-medium">{filteredTotal}건 표시</span>}
 </div>
 </div>
 </header>

 <main className="max-w-5xl mx-auto px-4 py-6">
 {showGroupInput && (
 <div className="mb-4 flex gap-2">
 <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createGroup()} placeholder="그룹 이름 입력" className="flex-1 border rounded-lg px-3 py-2 text-sm" autoFocus />
 <button onClick={createGroup} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">생성</button>
 <button onClick={() => { setShowGroupInput(false); setNewGroupName(""); }} className="bg-gray-400 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-500">취소</button>
 </div>
 )}

 {groups.map((group) => {
 const groupColors = getColorsForGroup(group.group_id);
 const isOpen = openGroupIds.has(group.group_id);
 const isEditing = editingGroupId === group.group_id;
 return (
 <div key={group.group_id} className="mb-3">
 <div className="bg-white rounded-lg shadow-sm border px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50" onClick={() => { if (!isEditing) toggleGroup(group.group_id); }}>
 <div className="flex items-center gap-3">
 <span className="text-gray-400 text-sm">{isOpen ? "▼" : "▶"}</span>
 {isEditing ? (
 <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
 <input type="text" value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveEditGroup(group.group_id); if (e.key === "Escape") setEditingGroupId(null); }} className="border rounded px-2 py-1 text-sm" autoFocus />
 <button onClick={() => saveEditGroup(group.group_id)} className="text-green-600 hover:text-green-800 text-sm font-medium">저장</button>
 <button onClick={() => setEditingGroupId(null)} className="text-gray-400 hover:text-gray-600 text-sm">취소</button>
 </div>
 ) : (
 <>
 <span className="font-semibold text-gray-800">{group.group_name}</span>
 <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{groupColors.length}건</span>
 </>
 )}
 </div>
 {!isEditing && (
 <div className="flex items-center gap-2">
 <button onClick={(e) => { e.stopPropagation(); openColorForm(group.group_id); }} className="text-blue-600 hover:text-blue-800 text-sm font-medium">+ 컬러</button>
 <button onClick={(e) => { e.stopPropagation(); startEditGroup(group); }} className="text-gray-500 hover:text-gray-700 text-sm">수정</button>
 <button onClick={(e) => { e.stopPropagation(); deleteGroup(group.group_id); }} className="text-red-400 hover:text-red-600 text-sm">삭제</button>
 </div>
 )}
 </div>

 {showColorForm === group.group_id && (
 <div className="ml-6 mt-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
 <h3 className="text-sm font-semibold text-blue-800 mb-3">새 컬러 등록</h3>
 <div className="grid grid-cols-2 gap-3">
 <div><label className="block text-xs text-gray-600 mb-1">컬러명 *</label><input type="text" value={newColor.color_name} onChange={(e) => setNewColor({ ...newColor, color_name: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" autoFocus /></div>
 <div><label className="block text-xs text-gray-600 mb-1">모드</label><select value={newColor.mode} onChange={(e) => setNewColor({ ...newColor, mode: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm"><option value="matching">컬러매칭</option><option value="translucency">투광</option></select></div>
 <div><label className="block text-xs text-gray-600 mb-1">고객사</label><input type="text" value={newColor.customer} onChange={(e) => setNewColor({ ...newColor, customer: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
 <div><label className="block text-xs text-gray-600 mb-1">제품</label><input type="text" value={newColor.product} onChange={(e) => setNewColor({ ...newColor, product: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
 <div><label className="block text-xs text-gray-600 mb-1">도료사</label><input type="text" value={newColor.paint_shop} onChange={(e) => setNewColor({ ...newColor, paint_shop: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
 <div><label className="block text-xs text-gray-600 mb-1">개발단계</label><input type="text" value={newColor.dev_stage} onChange={(e) => setNewColor({ ...newColor, dev_stage: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
 <div><label className="block text-xs text-gray-600 mb-1">담당자</label><input type="text" value={newColor.manager} onChange={(e) => setNewColor({ ...newColor, manager: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
 </div>
 <div className="mt-3 flex gap-2 justify-end">
 <button onClick={() => { setShowColorForm(null); setNewColor({ ...emptyColor }); }} className="bg-gray-400 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-500">취소</button>
 <button onClick={createColor} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">등록</button>
 </div>
 </div>
 )}

 {isOpen && (
 <div className="ml-6 mt-2 space-y-2">
 {groupColors.length === 0 && showColorForm !== group.group_id ? (
 <p className="text-sm text-gray-400 py-2">{hasActiveFilter ? "필터 조건에 맞는 컬러가 없습니다." : "등록된 컬러가 없습니다."}</p>
 ) : (
 groupColors.map((color) => (
 <div key={color.color_id} className="bg-white rounded-lg border px-4 py-3 flex justify-between items-center hover:shadow-sm cursor-pointer" onClick={() => router.push(`/colors/${color.color_id}`)}>
 <div>
 <span className="font-medium text-gray-800">{color.color_name}</span>
 <span className="ml-2 text-xs text-gray-500">{color.customer} · {color.product}</span>
 <span className="ml-2 text-xs text-blue-500">{color.mode === "translucency" ? "투광" : "매칭"}</span>
 </div>
 <div className="flex items-center gap-3">
 <span className="text-xs">{statusLabel(color.status)}</span>
 <span className="text-xs text-gray-400">{color.dev_stage}</span>
 <button onClick={(e) => { e.stopPropagation(); deleteColor(color.color_id); }} className="text-red-400 hover:text-red-600 text-xs">삭제</button>
 </div>
 </div>
 ))
 )}
 </div>
 )}
 </div>
 );
 })}

 {ungroupedColors.length > 0 && (
 <div className="mt-6">
 <h2 className="text-sm font-semibold text-gray-500 mb-2">미분류 ({ungroupedColors.length}건)</h2>
 <div className="space-y-2">
 {ungroupedColors.map((color) => (
 <div key={color.color_id} className="bg-white rounded-lg border px-4 py-3 flex justify-between items-center hover:shadow-sm cursor-pointer" onClick={() => router.push(`/colors/${color.color_id}`)}>
 <div>
 <span className="font-medium text-gray-800">{color.color_name}</span>
 <span className="ml-2 text-xs text-gray-500">{color.customer} · {color.product}</span>
 </div>
 <span className="text-xs">{statusLabel(color.status)}</span>
 </div>
 ))}
 </div>
 </div>
 )}

 {groups.length === 0 && ungroupedColors.length === 0 && (
 <div className="text-center py-20 text-gray-400">
 <p className="text-lg mb-2">아직 등록된 데이터가 없습니다.</p>
 <p className="text-sm">위의 "그룹 추가" 버튼으로 시작하세요.</p>
 </div>
 )}
 </main>
 </div>
 );
}
