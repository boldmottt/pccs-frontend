"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface Group { 
  group_id: number; 
  group_name: string; 
  sort_order: number;
  customer: string | null;
  product: string | null;
  manager: string | null;
  status: string | null;
}

interface Pattern { 
  pattern_id: number; 
  group_id: number | null; 
  pattern_name: string;
  color_count: number;
  status: string;
  dev_stage: string | null;
}

interface NewGroup { 
  group_name: string;
  customer?: string;
  product?: string;
  manager?: string;
}

export default function HomePage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [openGroupIds, setOpenGroupIds] = useState<Set<number>>(new Set());
  const [newGroupName, setNewGroupName] = useState("");
  const [showGroupInput, setShowGroupInput] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState<number | null>(null);
  const [newGroup, setNewGroup] = useState<NewGroup>({ group_name: "" });
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editGroupName, setEditGroupName] = useState("");

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCustomer, setFilterCustomer] = useState<string>("all");
  const [filterManager, setFilterManager] = useState<string>("all");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [gRes, pRes] = await Promise.all([
        api.get("/api/groups/"),
        api.get("/api/patterns/")
      ]);
      setGroups(gRes.data);
      setPatterns(pRes.data);
    } catch (err) {
      console.error("데이터 로드 실패:", err);
    }
  };

  const toggleGroup = (groupId: number) => {
    setOpenGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const createGroup = async () => {
    if (!newGroup.group_name.trim()) return;
    try {
      await api.post("/api/groups/", newGroup);
      setNewGroup({ group_name: "" });
      setShowGroupForm(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const startEditGroup = (group: Group) => {
    setEditingGroupId(group.group_id);
    setEditGroupName(group.group_name);
  };

  const saveEditGroup = async (groupId: number) => {
    if (!editGroupName.trim()) return;
    try {
      await api.put(`/api/groups/${groupId}`, { 
        group_name: editGroupName.trim(),
        sort_order: groups.find((g) => g.group_id === groupId)?.sort_order || 0
      });
      setEditingGroupId(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteGroup = async (groupId: number) => {
    const pc = patterns.filter((p) => p.group_id === groupId);
    if (!confirm(`패턴 ${pc.length}건이 있습니다. 삭제하시겠습니까?`)) return;
    try {
      await api.delete(`/api/groups/${groupId}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case "confirmed": return "✅ 확정";
      case "in_progress": return "🔄 진행중";
      case "hold": return "⏸ 보류";
      default: return s;
    }
  };

  const getPatternsForGroup = (groupId: number) => {
    return patterns.filter((p) => {
      if (p.group_id !== groupId) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      return true;
    }).sort((a, b) => a.pattern_id - b.pattern_id);
  };

  const customers = [...new Set(groups.map(g => g.customer).filter(Boolean))] as string[];
  const managers = [...new Set(groups.map(g => g.manager).filter(Boolean))] as string[];

  const hasActiveFilter = filterStatus !== "all" || filterCustomer !== "all" || filterManager !== "all";
  const filteredTotal = patterns.filter(p => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterCustomer !== "all" && !groups.find(g => g.group_id === p.group_id)?.customer?.includes(filterCustomer)) return false;
    if (filterManager !== "all" && !groups.find(g => g.group_id === p.group_id)?.manager?.includes(filterManager)) return false;
    return true;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-800">PCCS <span className="text-sm font-normal text-gray-500">v3.0</span></h1>
            <div className="flex gap-2">
              <button onClick={() => router.push("/dashboard")} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700">대시보드</button>
              <button onClick={() => router.push("/complementary")} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">보색 추출</button>
              <button onClick={() => router.push("/master")} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700">마스터 관리</button>
              <button onClick={() => setShowGroupInput(!showGroupInput)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">+ 그룹 추가</button>
            </div>
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

      <main className="max-w-6xl mx-auto px-4 py-6">
        {showGroupInput && (
          <div className="mb-4 flex gap-2">
            <input 
              type="text" 
              value={newGroupName} 
              onChange={(e) => setNewGroupName(e.target.value)} 
              onKeyDown={(e) => e.key === "Enter" && createGroup()} 
              placeholder="그룹 이름 입력" 
              className="flex-1 border rounded-lg px-3 py-2 text-sm" 
              autoFocus 
            />
            <button onClick={createGroup} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">생성</button>
            <button onClick={() => { setShowGroupInput(false); setNewGroupName(""); }} className="bg-gray-400 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-500">취소</button>
          </div>
        )}

        {groups.map((group) => {
          const groupPatterns = getPatternsForGroup(group.group_id);
          const isOpen = openGroupIds.has(group.group_id);
          const isEditing = editingGroupId === group.group_id;

          return (
            <div key={group.group_id} className="mb-3">
              <div className="bg-white rounded-lg shadow-sm border px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50" onClick={() => { if (!isEditing) toggleGroup(group.group_id); }}>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm">{isOpen ? "▼" : "▶"}</span>
                  {isEditing ? (
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="text" 
                        value={editGroupName} 
                        onChange={(e) => setEditGroupName(e.target.value)} 
                        onKeyDown={(e) => { if (e.key === "Enter") saveEditGroup(group.group_id); if (e.key === "Escape") setEditingGroupId(null); }} 
                        className="border rounded px-2 py-1 text-sm" 
                        autoFocus 
                      />
                      <button onClick={() => saveEditGroup(group.group_id)} className="text-green-600 hover:text-green-800 text-sm font-medium">저장</button>
                      <button onClick={() => setEditingGroupId(null)} className="text-gray-400 hover:text-gray-600 text-sm">취소</button>
                    </div>
                  ) : (
                    <>
                      <span className="font-semibold text-gray-800">{group.group_name}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{groupPatterns.length}개 패턴</span>
                      {group.customer && <span className="text-xs text-gray-600">• {group.customer}</span>}
                      {group.product && <span className="text-xs text-gray-600">• {group.product}</span>}
                      {group.manager && <span className="text-xs text-gray-600">• 담당: {group.manager}</span>}
                      {group.status && <span className="text-xs text-gray-500">{getStatusLabel(group.status)}</span>}
                    </>
                  )}
                </div>
                {!isEditing && (
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setShowGroupForm(group.group_id); }} className="text-blue-600 hover:text-blue-800 text-sm font-medium">+ 패턴</button>
                    <button onClick={(e) => { e.stopPropagation(); startEditGroup(group); }} className="text-gray-500 hover:text-gray-700 text-sm">수정</button>
                    <button onClick={(e) => { e.stopPropagation(); deleteGroup(group.group_id); }} className="text-red-400 hover:text-red-600 text-sm">삭제</button>
                  </div>
                )}
              </div>

              {showGroupForm === group.group_id && (
                <div className="ml-6 mt-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-800 mb-3">새 패턴 등록</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">패턴명 *</label>
                      <input 
                        type="text" 
                        value={newGroup.group_name} 
                        onChange={(e) => setNewGroup({ ...newGroup, group_name: e.target.value, customer: group.customer || "", product: group.product || "", manager: group.manager || "" })} 
                        className="w-full border rounded px-2 py-1.5 text-sm" 
                        autoFocus 
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">도수</label>
                      <input 
                        type="number" 
                        value={1} 
                        readOnly 
                        className="w-full border rounded px-2 py-1.5 text-sm bg-gray-100" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">고객사</label>
                      <input 
                        type="text" 
                        value={newGroup.customer || ""} 
                        onChange={(e) => setNewGroup({ ...newGroup, customer: e.target.value })} 
                        className="w-full border rounded px-2 py-1.5 text-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">제품</label>
                      <input 
                        type="text" 
                        value={newGroup.product || ""} 
                        onChange={(e) => setNewGroup({ ...newGroup, product: e.target.value })} 
                        className="w-full border rounded px-2 py-1.5 text-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">담당자</label>
                      <input 
                        type="text" 
                        value={newGroup.manager || ""} 
                        onChange={(e) => setNewGroup({ ...newGroup, manager: e.target.value })} 
                        className="w-full border rounded px-2 py-1.5 text-sm" 
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2 justify-end">
                    <button onClick={() => { setShowGroupForm(null); setNewGroup({ group_name: "" }); }} className="bg-gray-400 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-500">취소</button>
                    <button onClick={createGroup} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">등록</button>
                  </div>
                </div>
              )}

              {isOpen && (
                <div className="ml-6 mt-2 space-y-2">
                  {groupPatterns.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">{hasActiveFilter ? "필터 조건에 맞는 패턴이 없습니다." : "등록된 패턴이 없습니다."}</p>
                  ) : (
                    groupPatterns.map((pattern) => (
                      <div 
                        key={pattern.pattern_id} 
                        className="bg-white rounded-lg border px-4 py-3 flex justify-between items-center hover:shadow-sm cursor-pointer"
                        onClick={() => router.push(`/patterns/${pattern.pattern_id}`)}
                      >
                        <div>
                          <span className="font-medium text-gray-800">{pattern.pattern_name}</span>
                          <span className="ml-2 text-xs text-gray-500">
                            {pattern.color_count}도
                          </span>
                          <span className="ml-2 text-xs text-gray-500">
                            {group.customer} · {group.product}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs">{getStatusLabel(pattern.status)}</span>
                          <span className="text-xs text-gray-400">{pattern.dev_stage}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {groups.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-2">아직 등록된 데이터가 없습니다.</p>
            <p className="text-sm">위의 "그룹 추가" 버튼으로 시작하세요.</p>
          </div>
        )}
      </main>
    </div>
  );
}
