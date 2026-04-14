# -*- coding: utf-8 -*-
"""
🔌 리코 (Rico) - 프론트엔드 API 통합 특화

정체성: 데이터 흐름 설계자
"상태는 하나, 진실은 하나."
복잡한 상태 관리를 싫어하며, 서버 상태와 클라이언트 상태를 명확히 구분합니다.
"""

from typing import Dict, Any, List, Optional, Callable, TypeVar, Generic
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod
import asyncio


T = TypeVar('T')


class RicoRole(Enum):
    """리코의 역할"""
    API_SERVICE = "api_service"
    STATE_MANAGEMENT = "state_management"
    CUSTOM_HOOKS = "custom_hooks"
    ERROR_HANDLING = "error_handling"
    CACHING = "caching"


@dataclass
class ApiEndpoint:
    """API 엔드포인트 정의"""
    method: str
    path: str
    description: str
    params: Optional[Dict[str, str]] = None
    body: Optional[Dict[str, str]] = None
    response: Optional[Dict[str, str]] = None


@dataclass
class RicoAgentSpec:
    """리코 에이전트 스펙"""
    name: str = "리코 (Rico)"
    role: str = "프론트엔드 API 통합 특화"
    tagline: str = "데이터 흐름 설계자"
    motto: str = "상태는 하나, 진실은 하나"

    responsibilities: List[str] = None
    expertise: List[str] = None
    principles: List[str] = None
    communication: Dict[str, str] = None

    def __post_init__(self):
        if self.responsibilities is None:
            self.responsibilities = [
                "API 서비스 레이어 구현 (Axios)",
                "React Query / Zustand 상태 관리",
                "커스텀 훅 개발",
                "에러 처리 및 로딩 상태 관리",
                "데이터 캐싱 전략"
            ]
        if self.expertise is None:
            self.expertise = [
                "커스텀 훅: `useFetch`, `useMutation`, `useInfiniteQuery`",
                "상태 관리: 서버 상태 vs 클라이언트 상태 분리",
                "에러 핸들링: 네트워크 에러, 비즈니스 로직 에러 구분",
                "최적화: debounce, throttle, request cancellation"
            ]
        if self.principles is None:
            self.principles = [
                "서버 상태 외부화 — 데이터는 컴포넌트 바깥에서 관리",
                "최소 상태 원칙 — 필요한 최소한의 상태만",
                "에러 전파 — 비즈니스 로직 에러를 UI 에 명확히 전달",
                "로딩 전략 — skeleton screen 사용, optimistic update 고려"
            ]
        if self.communication is None:
            self.communication = {
                "input": "API 스펙, UI 요구사항, 데이터 모델",
                "output": "서비스 레이어 코드, 커스텀 훅, 상태 관리 전략"
            }

    def get_description(self) -> str:
        """에이전트 설명"""
        return f"""{self.name} - {self.role}

**{self.tagline}**. "{self.motto}"

## 책임 영역
""" + "\n".join(f"- {r}" for r in self.responsibilities) + """

## 전문 지식
""" + "\n".join(f"- {e}" for e in self.expertise) + """

## 작업 원칙
""" + "\n".join(f"{i}. {p}" for i, p in enumerate(self.principles, 1)) + """

## 통신 형식
📥 입력: """ + self.communication["input"] + """
📤 출력: """ + self.communication["output"] + """

## 협업 파트너
- 🤝 소울 (Soul) — API 설계자와 밀접하게 협업
- 🤝 마르코 (Marco) — 팀장과 상태 관리 전략 조율
"""


class ApiError(Exception):
    """API 에러"""
    def __init__(self, message: str, status_code: Optional[int] = None):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class ApiService:
    """API 서비스 클래스 (Axios 기반)"""

    def __init__(self, base_url: str):
        self.base_url = base_url
        self.requests: List[Asyncio.Future] = []

    async def get(self, endpoint: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """GET 요청"""
        # Implementation would use axios here
        pass

    async def post(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """POST 요청"""
        pass

    async def put(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """PUT 요청"""
        pass

    async def delete(self, endpoint: str) -> Dict[str, Any]:
        """DELETE 요청"""
        pass


class RicoHookBuilder:
    """리코 커스텀 훅 빌더"""

    def __init__(self, api_service: ApiService):
        self.api_service = api_service

    def build_use_fetch(self, endpoint: str, options: Optional[Dict] = None) -> str:
        """
        useFetch 커스텀 훅 생성

        Args:
            endpoint: API 엔드포인트
            options: 훅 옵션 (debounce, refetchInterval, etc.)

        Returns:
            TypeScript 코드
        """
        code = f"""// Rico - useFetch Hook
// Principle: 서버 상태 외부화, 최소 상태 원칙

import {{ useState, useEffect, useCallback }} from 'react';
import axios from 'axios';

interface FetchState<T> {{
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}}

export function useFetch<T>(
  endpoint: string,
  options: {{
    debounceMs?: number;
    immediate?: boolean;
  }} = {{}}
): FetchState<T> {{
  const {{ debounceMs = 0, immediate = true }} = options;
  const [state, setState] = useState<FetchState<T>>({{
    data: null,
    loading: !immediate,
    error: null,
  }});

  useEffect(() => {{
    let cancelled = false;
    let timeoutId: NodeJS.Timeout;

    const fetchData = async () => {{
      try {{
        const response = await axios.get(`{{endpoint}}`);
        if (!cancelled) {{
          setState({{ data: response.data, loading: false, error: null }});
        }}
      }} catch (error) {{
        if (!cancelled) {{
          setState({{
            data: null,
            loading: false,
            error: new ApiError('API 요청 실패', 500),
          }});
        }}
      }}
    }};

    if (debounceMs > 0) {{
      timeoutId = setTimeout(fetchData, debounceMs);
    }} else {{
      fetchData();
    }}

    return () => {{
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    }};
  }}, [endpoint, debounceMs]);

  return state;
}}
"""
        return code

    def build_use_infinite_query(self, endpoint: str, key: str) -> str:
        """
        useInfiniteQuery 커스텀 훅 생성

        Args:
            endpoint: API 엔드포인트
            key: 쿼리 키

        Returns:
            TypeScript 코드
        """
        code = f"""// Rico - useInfiniteQuery Hook
// Principle: 서버 상태 외부화, 최소 상태 원칙

import {{ useInfiniteQuery }} from '@tanstack/react-query';

interface InfiniteData<T> {{
  pages: T[];
  pageParams: number[];
}}

export function useInfiniteQuery<T>(
  endpoint: string,
  key: string = '{key}'
) {{
  return useInfiniteQuery<InfiniteData<T>, Error>>({{
    queryKey: [key],
    queryFn: async {{({{ pageParam = 1 }}) => {{
      const response = await axios.get(`{{endpoint}}`, {{ params: {{ page: pageParam }} }});
      return response.data;
    }}},
    getNextPageParam: (lastPage) => {{
      // Implement pagination logic
      return lastPage.next_page;
    }},
  }});
}}
"""
        return code


class RicoAgent:
    """리코 API 통합 에이전트"""

    def __init__(self):
        self.spec = RicoAgentSpec()
        self.mode = "api_integration"
        self.services: Dict[str, ApiService] = {}

    def describe(self) -> RicoAgentSpec:
        """에이전트 설명 반환"""
        return self.spec

    def create_service_layer(self, endpoints: List[ApiEndpoint]) -> str:
        """
        API 서비스 레이어 생성

        Args:
            endpoints: API 엔드포인트 목록

        Returns:
            TypeScript 서비스 코드
        """
        code = f"""// Rico - API Service Layer
// Principle: 서버 상태 외부화, 에러 전파

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({{
  baseURL: API_BASE_URL,
  headers: {{
    'Content-Type': 'application/json',
  }},
}});

{chr(10).join(self._generate_service_methods(endpoints))}
"""
        return code

    def _generate_service_methods(self, endpoints: List[ApiEndpoint]) -> List[str]:
        """서비스 메서드 생성"""
        methods = []
        for ep in endpoints:
            method_name = ep.method.lower()
            func_name = f"_{ep.path.replace('/', '_').strip('_')}"
            methods.append(f"""
export const {func_name.replace('_', '', 1)} = {{
  {method_name}: async (params?: any) => {{
    const response = await apiClient.{method_name}('{ep.path}', params);
    return response.data;
  }},
}};""")
        return methods

    def create_custom_hook(
        self,
        hook_name: str,
        endpoint: str,
        hook_type: str = "fetch"
    ) -> str:
        """
        커스텀 훅 생성

        Args:
            hook_name: 훅 이름
            endpoint: API 엔드포인트
            hook_type: 훅 타입 (fetch, mutation, infinite)

        Returns:
            TypeScript 훅 코드
        """
        builder = RicoHookBuilder(None)

        if hook_type == "fetch":
            return builder.build_use_fetch(endpoint)
        elif hook_type == "infinite":
            return builder.build_use_infinite_query(endpoint, hook_name)
        else:
            return builder.build_use_fetch(endpoint)

    def handle_error(self, error: Exception) -> ApiError:
        """
        에러 처리

        Args:
            error: 발생 에러

        Returns:
            ApiError 객체
        """
        if isinstance(error, ApiError):
            return error

        # 네트워크 에러 vs 비즈니스 로직 에러 구분
        if "network" in str(error).lower() or "failed" in str(error).lower():
            return ApiError("네트워크 연결 오류", 503)

        return ApiError("서버 오류", 500)

    def get_agent_prompt(self) -> str:
        """에이전트 시스템 프롬프트"""
        return f"""당신은 {self.spec.name}입니다.

**{self.tagline}**입니다.

## 핵심 신념
"{self.motto}"

## 책임 영역
{chr(10).join(f"• {r}" for r in self.responsibilities)}

## 전문 지식
{chr(10).join(f"• {e}" for e in self.expertise)}

## 작업 원칙
{chr(10).join(f"{i}. {p}" for i, p in enumerate(self.principles, 1))}

## 통신 형식
📥 입력: {self.communication["input"]}
📤 출력: {self.communication["output"]}

## 협업 파트너
- 🤝 소울 (Soul) — API 설계자와 밀접하게 협업
- 🤝 마르코 (Marco) — 팀장과 상태 관리 전략 조율

## 응답 규칙
- 서버 상태와 클라이언트 상태를 명확히 구분하세요
- axios 를 사용한 API 서비스 레이어를 구현하세요
- React Query, Zustand 등 상태 관리 라이브러리를 활용하세요
- 커스텀 훅 (useFetch, useMutation, useInfiniteQuery) 을 개발하세요
- 네트워크 에러와 비즈니스 로직 에러를 구분하세요
- debounce, throttle, request cancellation 을 활용하세요
- skeleton screen 을 사용하고 optimistic update 를 고려하세요
"""


def create_rico_agent() -> RicoAgent:
    """리코 에이전트 생성 팩토리"""
    return RicoAgent()
