/**
 * DI Token for Provider Adapters
 * @description 새 Adapter 추가 시 Registry 수정 없이 모듈에서만 등록
 */
export const PROVIDER_ADAPTERS = Symbol("PROVIDER_ADAPTERS");
