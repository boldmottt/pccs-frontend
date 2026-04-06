"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface Group {
  group_id: number;
  group_name: string;
  sort_order: number;
}

interface Color {
  color_id: number;
  group_id: number | null;
  color_name: string;
  mode: string;
  customer: string | null;
  product: string | null;
  status: string;
  dev_stage: string | null;
  manager: string | null;
}

interface NewColor {
  group_id: number | null;
  color_name: string;
  mode: string;
  customer: string;
  product: string;
  paint_shop: string;
  dev_stage: string;
  manager: string;
}

const emptyColor: NewColor = {
  group_id: null,
  color_name: "",
  mode: "matching",
  customer: "",
  product: "",
  paint_shop: "",
  dev_stage: "",
  manager: "",
};

export default function HomePage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [openGroupIds, setOpenGroupIds] = useState<Set<number>>(new Set());
  const [newGroupName, setNewGroupName] = useState("");
  const [showGroupInput, setShowGroupInput] = useState(false);
  const [showColorForm, setShowColorForm] = useState<number | null>(null);
  const [newColor, setNewColor] = useState<NewColor>({ ...emptyColor });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [gRes, cRes] = await Promise.all([
        api.get("/api/groups/"),
        api.get("/api/colors/"),
      ]);
      setGroups(gRes.data);
      setColors(cRes.data);
    } catch (err) {
      console.error("데이터 로드 실패:", err);
    }
  };

  const toggleGroup = (groupId: number) => {
    setOpenGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await api.post("/api/groups/", {
        group_name: newGroupName.trim(),
        sort_order: groups.length,
      });
      setNewGroupName("");
      setShowGroupInput(false);
      fetchData();
    } catch (err) {
      console.error("그룹 생성 실패:", err);
    }
  };

  const deleteGroup = async (groupId: number) => {
    if (!confirm("이 그룹을 삭제하시겠습니까?")) return;
    try {
      await api.delete(`/api/groups/${groupId}`);
      fetchData();
    } catch (err) {
      console.error("그룹 삭제 실패:", err);
    }
  };

  const openColorForm = (groupId: number) => {
    setNewColor({ ...emptyColor, group_id: groupId });
    setShowColorForm(groupId);
    if (!openGroupIds.has(groupId)) {
      setOpenGroupIds((prev) => new Set(prev).add(groupId));
    }
  };

  const createColor = async () => {
    if (!newColor.color_name.trim()) {
      alert("컬러 이름을 입력해주세요.");
      return;
    }
    try {
      await api.post("/api/colors/", newColor);
      setShowColorForm(null);
      setNewColor({ ...emptyColor });
      fetchData();
    } catch (err) {
      console.error("컬러 생성 실패:", err);
    }
  };

  const deleteColor = async (colorId: number) => {
    if (!confirm("이 컬러를 삭제하시겠습니까?")) return;
    try {
      await api.delete(`/api/colors/${colorId}`);
      fetchData();
    } catch (err) {
      console.error("컬러 삭제 실패:", err);
    }
  };

  const getColorsForGroup = (groupId: number) =>
    colors.filter((c) => c.group_id === groupId);

  const ungroupedColors = colors.filter((c) => c.group_id === null);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">
            PCCS <span className="text-sm font-normal text-gray-500">v2.1</span>
          </h1>
          <button
            onClick={() => setShowGroupInput(!showGroupInput)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            + 그룹 추가
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
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
            <button
              onClick={createGroup}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
            >
              생성
            </button>
            <button
              onClick={() => {
                setShowGroupInput(false);
                setNewGroupName("");
              }}
              className="bg-gray-400 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-500"
            >
              취소
            </button>
          </div>
        )}

        {groups.map((group) => {
          const groupColors = getColorsForGroup(group.group_id);
          const isOpen = openGroupIds.has(group.group_id);

          return (
            <div key={group.group_id} className="mb-3">
              <div
                className="bg-white rounded-lg shadow-sm border px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                onClick={() => toggleGroup(group.group_id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm">
                    {isOpen ? "▼" : "▶"}
                  </span>
                  <span className="font-semibold text-gray-800">
                    {group.group_name}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {groupColors.length}건
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openColorForm(group.group_id);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    + 컬러
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteGroup(group.group_id);
                    }}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    삭제
                  </button>
                </div>
              </div>

              {showColorForm === group.group_id && (
                <div className="ml-6 mt-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-800 mb-3">
                    새 컬러 등록
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        컬러명 *
                      </label>
                      <input
                        type="text"
                        value={newColor.color_name}
                        onChange={(e) =>
                          setNewColor({ ...newColor, color_name: e.target.value })
                        }
                        className="w-full border rounded px-2 py-1.5 text-sm"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        모드
                      </label>
                      <select
                        value={newColor.mode}
                        onChange={(e) =>
                          setNewColor({ ...newColor, mode: e.target.value })
                        }
                        className="w-full border rounded px-2 py-1.5 text-sm"
                      >
                        <option value="matching">컬러매칭</option>
                        <option value="translucency">투광</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        고객사
                      </label>
                      <input
                        type="text"
                        value={newColor.customer}
                        onChange={(e) =>
                          setNewColor({ ...newColor, customer: e.target.value })
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
                        value={newColor.product}
                        onChange={(e) =>
                          setNewColor({ ...newColor, product: e.target.value })
                        }
                        className="w-full border rounded px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        도료사
                      </label>
                      <input
                        type="text"
                        value={newColor.paint_shop}
                        onChange={(e) =>
                          setNewColor({ ...newColor, paint_shop: e.target.value })
                        }
                        className="w-full border rounded px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        개발단계
                      </label>
                      <input
                        type="text"
                        value={newColor.dev_stage}
                        onChange={(e) =>
                          setNewColor({ ...newColor, dev_stage: e.target.value })
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
                        value={newColor.manager}
                        onChange={(e) =>
                          setNewColor({ ...newColor, manager: e.target.value })
                        }
                        className="w-full border rounded px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setShowColorForm(null);
                        setNewColor({ ...emptyColor });
                      }}
                      className="bg-gray-400 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-500"
                    >
                      취소
                    </button>
                    <button
                      onClick={createColor}
                      className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
                    >
                      등록
                    </button>
                  </div>
                </div>
              )}

              {isOpen && (
                <div className="ml-6 mt-2 space-y-2">
                  {groupColors.length === 0 &&
                  showColorForm !== group.group_id ? (
                    <p className="text-sm text-gray-400 py-2">
                      등록된 컬러가 없습니다.
                    </p>
                  ) : (
                    groupColors.map((color) => (
                      <div
                        key={color.color_id}
                        className="bg-white rounded-lg border px-4 py-3 flex justify-between items-center hover:shadow-sm cursor-pointer"
                        onClick={() => router.push(`/colors/${color.color_id}`)}
                      >
                        <div>
                          <span className="font-medium text-gray-800">
                            {color.color_name}
                          </span>
                          <span className="ml-2 text-xs text-gray-500">
                            {color.customer} · {color.product}
                          </span>
                          <span className="ml-2 text-xs text-blue-500">
                            {color.mode === "translucency" ? "투광" : "매칭"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs">
                            {statusLabel(color.status)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {color.dev_stage}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteColor(color.color_id);
                            }}
                            className="text-red-400 hover:text-red-600 text-xs"
                          >
                            삭제
                          </button>
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
            <h2 className="text-sm font-semibold text-gray-500 mb-2">
              미분류 ({ungroupedColors.length}건)
            </h2>
            <div className="space-y-2">
              {ungroupedColors.map((color) => (
                <div
                  key={color.color_id}
                  className="bg-white rounded-lg border px-4 py-3 flex justify-between items-center hover:shadow-sm cursor-pointer"
                  onClick={() => router.push(`/colors/${color.color_id}`)}
                >
                  <div>
                    <span className="font-medium text-gray-800">
                      {color.color_name}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      {color.customer} · {color.product}
                    </span>
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
            <p className="text-sm">위의 &quot;그룹 추가&quot; 버튼으로 시작하세요.</p>
          </div>
        )}
      </main>
    </div>
  );
}
