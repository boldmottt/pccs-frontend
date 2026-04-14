"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { Tooltip, HelpIcon } from "@/components/common/Tooltip";
import { FormInput, FormSelect } from "@/components/common/FormInput";
import { Skeleton } from "@/components/common/Skeleton";
import { ColorSwatch } from "@/components/common/ColorSwatch";

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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [gRes, pRes] = await Promise.all([
        api.get("/api/groups/"),
        api.get("/api/patterns/"),
      ]);
      setGroups(gRes.data);
      setPatterns(pRes.data);
    } catch (err) {
      console.error("데이터 로드 실패:", err);
    } finally {
      setIsLoading(false);
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
        sort_order:
          groups.find((g) => g.group_id === groupId)?.sort_order || 0,
      });
      setEditingGroupId(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteGroup = async (groupId: number) => {
    const pc = patterns.filter((p) => p.group_id === groupId);
    if (
      !confirm(
        `패턴 ${pc.length}건이 있습니다. 삭제하시겠습니까?`,
      )
    )
      return;
    try {
      await api.delete(`/api/groups/${groupId}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case "confirmed":
        return "확정";
      case "in_progress":
        return "진행중";
      case "hold":
        return "보류";
      default:
        return s;
    }
  };

  const getPatternsForGroup = (groupId: number) => {
    return patterns
      .filter((p) => {
        if (p.group_id !== groupId) return false;
        if (filterStatus !== "all" && p.status !== filterStatus)
          return false;
        return true;
      })
      .sort((a, b) => a.pattern_id - b.pattern_id);
  };

  const customers = [
    ...new Set(groups.map((g) => g.customer).filter(Boolean)),
  ] as string[];
  const managers = [
    ...new Set(groups.map((g) => g.manager).filter(Boolean)),
  ] as string[];

  const hasActiveFilter =
    filterStatus !== "all" ||
    filterCustomer !== "all" ||
    filterManager !== "all";

  const filteredTotal = patterns.filter((p) => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (
      filterCustomer !== "all" &&
      !groups.find(
        (g) => g.group_id === p.group_id,
      )?.customer?.includes(filterCustomer)
    )
      return false;
    if (
      filterManager !== "all" &&
      !groups.find(
        (g) => g.group_id === p.group_id,
      )?.manager?.includes(filterManager)
    )
      return false;
    return true;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">PCCS</h1>
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-100">
                  Paint Color Control System
                </span>
                <Tooltip content="색상 관리를 위한 통합 시스템입니다">
                  <HelpIcon />
                </Tooltip>
              </div>
            </div>
            <div className="flex gap-2">
              <Tooltip content="통계 및 분석 대시보드">
                <PrimaryButton
                  onClick={() => router.push("/dashboard")}
                  variant="success"
                  size="sm"
                >
                  대시보드
                </PrimaryButton>
              </Tooltip>
              <Tooltip content="보색 색상 추출">
                <PrimaryButton
                  onClick={() => router.push("/complementary")}
                  variant="secondary"
                  size="sm"
                >
                  보색 추출
                </PrimaryButton>
              </Tooltip>
              <Tooltip content="잉크 마스터 관리">
                <PrimaryButton
                  onClick={() => router.push("/master")}
                  variant="secondary"
                  size="sm"
                >
                  마스터 관리
                </PrimaryButton>
              </Tooltip>
              <Tooltip content="새 그룹 생성">
                <PrimaryButton
                  onClick={() => setShowGroupInput(!showGroupInput)}
                  variant="primary"
                  size="sm"
                >
                  + 그룹 추가
                </PrimaryButton>
              </Tooltip>
            </div>
          </div>

          {/* 필터 */}
          <div className="mt-4 flex flex-wrap gap-3 items-center bg-white bg-opacity-10 rounded-lg p-3">
            <span className="text-xs text-blue-100 font-medium flex items-center gap-1">
              필터
              <Tooltip content="데이터를 조건별로 선택합니다">
                <HelpIcon />
              </Tooltip>
            </span>
            <FormSelect
              id="filter-status"
              label=""
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { value: "all", label: "전체 상태" },
                { value: "in_progress", label: "진행중" },
                { value: "confirmed", label: "확정" },
                { value: "hold", label: "보류" },
              ]}
              className="bg-white"
            />
            {customers.length > 0 && (
              <FormSelect
                id="filter-customer"
                label=""
                value={filterCustomer}
                onChange={setFilterCustomer}
                options={[
                  { value: "all", label: "전체 고객사" },
                  ...customers.map((c) => ({ value: c, label: c })),
                ]}
                className="bg-white"
              />
            )}
            {managers.length > 0 && (
              <FormSelect
                id="filter-manager"
                label=""
                value={filterManager}
                onChange={setFilterManager}
                options={[
                  { value: "all", label: "전체 담당자" },
                  ...managers.map((m) => ({ value: m, label: m })),
                ]}
                className="bg-white"
              />
            )}
            <div className="flex-1" />
            {hasActiveFilter && (
              <button
                onClick={() => {
                  setFilterStatus("all");
                  setFilterCustomer("all");
                  setFilterManager("all");
                }}
                className="text-xs text-white hover:text-blue-200 underline"
              >
                필터 초기화
              </button>
            )}
            {hasActiveFilter && (
              <span className="text-xs text-white font-medium">
                {filteredTotal}개 패턴 표시
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton lines={3} className="h-12" variant="rounded" />
            <Skeleton lines={5} className="h-48" variant="rounded" />
            <Skeleton lines={5} className="h-48" variant="rounded" />
            <Skeleton lines={5} className="h-48" variant="rounded" />
          </div>
        ) : (
          <>
            {showGroupInput && (
              <div className="mb-4 bg-white rounded-lg shadow-md border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold text-gray-700">
                    새 그룹 생성
                  </span>
                  <Tooltip content="그룹을 생성하면 패턴을 이 그룹에 할당할 수 있습니다">
                    <HelpIcon />
                  </Tooltip>
                </div>
                <div className="flex gap-3 items-center">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => {
                      setNewGroupName(e.target.value);
                      setNewGroup({ group_name: e.target.value });
                    }}
                    onKeyDown={(e) => e.key === "Enter" && createGroup()}
                    placeholder="그룹 이름 입력"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                    aria-label="그룹 이름"
                  />
                  <PrimaryButton onClick={createGroup} variant="success" size="sm">
                    생성
                  </PrimaryButton>
                  <PrimaryButton
                    onClick={() => {
                      setShowGroupInput(false);
                      setNewGroupName("");
                    }}
                    variant="secondary"
                    size="sm"
                  >
                    취소
                  </PrimaryButton>
                </div>
              </div>
            )}

            {groups.map((group) => {
              const groupPatterns = getPatternsForGroup(group.group_id);
              const isOpen = openGroupIds.has(group.group_id);
              const isEditing = editingGroupId === group.group_id;

              return (
                <div key={group.group_id} className="mb-3">
                  <div
                    className="bg-white rounded-lg shadow-sm border px-4 py-4 flex justify-between items-center cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      if (!isEditing) toggleGroup(group.group_id);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    aria-label={`${group.group_name} 그룹`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (!isEditing) toggleGroup(group.group_id);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span
                        className="text-gray-400 text-sm"
                        aria-hidden="true"
                      >
                        {isOpen ? "▼" : "▶"}
                      </span>
                      {isEditing ? (
                        <div
                          className="flex gap-2 flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editGroupName}
                            onChange={(e) => setEditGroupName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                saveEditGroup(group.group_id);
                              if (e.key === "Escape") setEditingGroupId(null);
                            }}
                            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            autoFocus
                            aria-label="그룹 이름 수정"
                          />
                          <button
                            onClick={() => saveEditGroup(group.group_id)}
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                            aria-label="그룹 저장"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => setEditingGroupId(null)}
                            className="text-gray-400 hover:text-gray-600 text-sm"
                            aria-label="그룹 수정 취소"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-semibold text-gray-800 text-base">
                            {group.group_name}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {groupPatterns.length}개 패턴
                          </span>
                          {group.customer && (
                            <span className="text-xs text-gray-600">
                              • 고객: {group.customer}
                            </span>
                          )}
                          {group.product && (
                            <span className="text-xs text-gray-600">
                              • 제품: {group.product}
                            </span>
                          )}
                          {group.manager && (
                            <span className="text-xs text-gray-600">
                              • 담당: {group.manager}
                            </span>
                          )}
                          {group.status && (
                            <span
                              className="text-xs text-gray-500"
                              title={getStatusLabel(group.status)}
                            >
                              {getStatusLabel(group.status)}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    {!isEditing && (
                      <div className="flex items-center gap-2 ml-4">
                        <Tooltip content="새 패턴 추가">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowGroupForm(group.group_id);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            aria-label="새 패턴 추가"
                          >
                            + 패턴
                          </button>
                        </Tooltip>
                        <Tooltip content="그룹 수정">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditGroup(group);
                            }}
                            className="text-gray-500 hover:text-gray-700 text-sm"
                            aria-label="그룹 수정"
                          >
                            수정
                          </button>
                        </Tooltip>
                        <Tooltip content="그룹 삭제">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteGroup(group.group_id);
                            }}
                            className="text-red-400 hover:text-red-600 text-sm"
                            aria-label="그룹 삭제"
                          >
                            삭제
                          </button>
                        </Tooltip>
                      </div>
                    )}
                  </div>

                  {showGroupForm === group.group_id && (
                    <div className="ml-6 mt-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-blue-800 mb-3">
                        새 패턴 등록
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            패턴명 *
                          </label>
                          <input
                            type="text"
                            value={newGroup.group_name}
                            onChange={(e) =>
                              setNewGroup({
                                ...newGroup,
                                group_name: e.target.value,
                                customer: group.customer || "",
                                product: group.product || "",
                                manager: group.manager || "",
                              })
                            }
                            className="w-full border rounded px-2 py-1.5 text-sm"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            도수
                          </label>
                          <input
                            type="number"
                            value={1}
                            readOnly
                            className="w-full border rounded px-2 py-1.5 text-sm bg-gray-100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            고객사
                          </label>
                          <input
                            type="text"
                            value={newGroup.customer || ""}
                            onChange={(e) =>
                              setNewGroup({ ...newGroup, customer: e.target.value })
                            }
                            className="w-full border rounded px-2 py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            제품
                          </label>
                          <input
                            type="text"
                            value={newGroup.product || ""}
                            onChange={(e) =>
                              setNewGroup({ ...newGroup, product: e.target.value })
                            }
                            className="w-full border rounded px-2 py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            담당자
                          </label>
                          <input
                            type="text"
                            value={newGroup.manager || ""}
                            onChange={(e) =>
                              setNewGroup({ ...newGroup, manager: e.target.value })
                            }
                            className="w-full border rounded px-2 py-1.5 text-sm"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2 justify-end">
                        <button
                          onClick={() => {
                            setShowGroupForm(null);
                            setNewGroup({ group_name: "" });
                          }}
                          className="bg-gray-400 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-500"
                        >
                          취소
                        </button>
                        <button
                          onClick={createGroup}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
                        >
                          등록
                        </button>
                      </div>
                    </div>
                  )}

                  {isOpen && (
                    <div className="ml-6 mt-2 space-y-2">
                      {groupPatterns.length === 0 ? (
                        <p className="text-sm text-gray-400 py-2">
                          {hasActiveFilter
                            ? "필터 조건에 맞는 패턴이 없습니다."
                            : "등록된 패턴이 없습니다."}
                        </p>
                      ) : (
                        groupPatterns.map((pattern) => (
                          <div
                            key={pattern.pattern_id}
                            className="bg-white rounded-lg border px-4 py-3 flex justify-between items-center hover:shadow-sm cursor-pointer"
                            onClick={() =>
                              router.push(`/patterns/${pattern.pattern_id}`)
                            }
                          >
                            <div>
                              <span className="font-medium text-gray-800">
                                {pattern.pattern_name}
                              </span>
                              <span className="ml-2 text-xs text-gray-500">
                                {pattern.color_count}도
                              </span>
                              <span className="ml-2 text-xs text-gray-500">
                                {group.customer} · {group.product}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs">
                                {getStatusLabel(pattern.status)}
                              </span>
                              <span className="text-xs text-gray-400">
                                {pattern.dev_stage}
                              </span>
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
                <p className="text-sm">
                  위의 "그룹 추가" 버튼으로 시작하세요.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
