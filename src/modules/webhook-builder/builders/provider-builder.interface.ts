import { GeneratedMessageDto } from "../dto/generate-message.dto";

/**
 * Provider Options DTO
 * @description 각 Provider별 Options 응답 구조
 */
export interface ProviderOptionsDto {
  provider: string;
  markets?: SelectOption[];
  actions?: SelectOption[];
  entryTypes?: SelectOption[];
  qtyTypes?: SelectOption[];
  tpSlTypes?: SelectOption[];
  positionModes?: SelectOption[];
  quoteAssets?: SelectOption[];
  // Discord specific
  messageTypes?: SelectOption[];
  mentionTypes?: SelectOption[];
  // KIS specific
  orderTypes?: SelectOption[];
  accountTypes?: SelectOption[];
  // Common
  defaults?: Record<string, NumberRange>;
}

/**
 * Select Option
 */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Number Range
 */
export interface NumberRange {
  min: number;
  max: number;
  default: number;
}

/**
 * Provider Template
 */
export interface ProviderTemplate {
  name: string;
  description: string;
  payload: Record<string, unknown>;
}

/**
 * Provider Builder Adapter Interface
 * @description 각 Provider별 Builder 인터페이스
 */
export interface ProviderBuilderAdapter {
  /**
   * Provider 식별자
   */
  readonly provider: string;

  /**
   * 프론트엔드 Select 옵션 조회
   */
  getOptions(): ProviderOptionsDto;

  /**
   * 메시지 생성
   * @param input - Provider별 입력 데이터
   */
  generateMessage(input: Record<string, unknown>): GeneratedMessageDto;

  /**
   * JSON 스키마 조회
   */
  getSchema(): Record<string, unknown>;

  /**
   * 예제 템플릿 조회
   */
  getTemplates(): ProviderTemplate[];
}
