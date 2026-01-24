# Frontend API Documentation Update Summary

## 변경 사항 개요

두 개의 API 문서를 최신 구현 사항과 일치하도록 업데이트했습니다:

- `docs/webhook/frontend_api.md`
- `docs/webhook/frontend_api_spec.md`

## 주요 변경 내역

### 1. 인증 (Authentication) 섹션 대폭 확장

기존의 간단한 인증 설명을 다음과 같이 상세한 내용으로 대체했습니다:

#### 추가된 인증 방법 (Passwordless Authentication)

**1. Magic Link 인증**

- `POST /v1/auth/magic-link/request` - 6자리 코드 이메일 전송
- `POST /v1/auth/magic-link/verify` (deprecated) - 구 방식
- `POST /v1/auth/verify` (권장) - 통합 토큰 검증

**2. Google OAuth 인증**

- `GET /v1/auth/oauth/google/start` - Google 로그인 시작
- `GET /v1/auth/oauth/google/callback` - 자동 콜백 (프론트엔드 직접 호출 X)

**3. Kakao OAuth 인증**

- `GET /v1/auth/oauth/kakao/start` - 카카오 로그인 시작
- `GET /v1/auth/oauth/kakao/callback` - 자동 콜백 (프론트엔드 직접 호출 X)

#### 토큰 관리

- `POST /v1/auth/refresh` - Access token 갱신
- `POST /v1/auth/logout` - Refresh token 무효화

#### 계정 관리

- `GET /v1/me` - 현재 사용자 정보 조회
- `PATCH /v1/me` - 프로필 수정
- `DELETE /v1/me` - 계정 삭제 (Soft Delete)

### 2. 인증 플로우 다이어그램 추가

Mermaid 시퀀스 다이어그램을 추가하여 Magic Link와 OAuth의 전체 인증 흐름을 시각화했습니다.

### 3. 상세한 요청/응답 스키마

모든 인증 엔드포인트에 대해 다음을 추가했습니다:

- Request Body 스키마 (필드 타입, 필수 여부, 검증 규칙)
- Response 스키마 (성공/실패 케이스 모두)
- Error Response 예시 (401, 404 등)

### 4. 실제 구현과 일치하는 스펙

실제 코드 기반으로 확인한 내용:

- 엔드포인트 경로 (`/v1/auth/*`, `/v1/me`)
- 토큰 만료 시간 (Access: 15분, Refresh: 30일)
- 응답 필드 구조 (user 객체의 app_id, role, profile 등)
- Authorization code flow 지원

### 5. 사용 예시 코드 추가

TypeScript 예시 코드 추가:

```typescript
// 로그아웃 처리 예시
// 계정 삭제 처리 예시
```

### 6. 중요 노트 및 경고 추가

GitHub 스타일 알림 블록 활용:

- `[!IMPORTANT]` - Passwordless 인증 사용
- `[!NOTE]` - 개발 환경 vs 프로덕션 차이
- `[!WARNING]` - Deprecated 엔드포인트
- `[!TIP]` - 로컬 스토리지 관리 팁
- `[!CAUTION]` - 계정 삭제 되돌릴 수 없음

### 7. Quick Start Guide 업데이트

기존의 password 기반 회원가입/로그인을 다음으로 대체:

- Magic Link 방식 인증 예시
- OAuth (Google/Kakao) 방식 인증 예시

### 8. 섹션 번호 재조정

User Management API를 Authentication API로 변경하고, 나머지 섹션 번호를 하나씩 올림:

- Exchange Key Management: 3 → 4
- Trade Logs: 4 → 5
- Trade Info: 5 → 6
- Dashboard: 6 → 7
- Notifications: 7 → 8
- Settings: 8 → 9
- Error Codes: 9 → 10
- Common Rules: 10 → 11

## 검증 완료 사항

✅ 실제 구현 코드 확인:

- `/src/modules/auth/auth.controller.ts`
- `/src/modules/auth/auth.service.ts`
- `/src/modules/auth/dto/auth.dto.ts`

✅ 엔드포인트 경로 일치
✅ 요청/응답 스키마 일치
✅ 에러 처리 일치

## 유의사항

### 구현되지 않은 기능 (문서에 "미구현" 표시됨)

- `POST /users/keys/:key_id/verify` - 거래소 키 검증
- `GET /requests/:signal_id` - Webhook 요청 상태 조회

### Kakao 특수사항

- 이메일 제공 선택사항
- 이메일 없을 시 `{kakao_id}@kakao.com` 자동 생성

### 보안 고려사항

- Soft Delete 방식의 계정 삭제
- Refresh token 무효화
- Access token 15분 만료 (보안 강화)

## 다음 단계 제안

1. 프론트엔드에서 새로운 인증 플로우 구현
2. 기존 password 기반 코드 제거 (있다면)
3. 로컬 스토리지 토큰 관리 정책 수립
4. 계정 삭제 확인 UI/UX 개선
5. OAuth redirect_uri 화이트리스트 설정
