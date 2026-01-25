import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

/**
 * API Key Verification Response DTO
 * @description API 키 검증 결과 응답 DTO
 */
export class KeyVerificationResultDto {
  @ApiProperty({ example: "uuid-123", description: "키 ID" })
  @Expose()
  keyId: string;

  @ApiProperty({ example: true, description: "유효성 여부" })
  @Expose()
  valid: boolean;

  @ApiProperty({
    example: { spotTrading: true, futuresTrading: true },
    description: "권한 정보 (검증 가능한 경우)",
  })
  @Expose()
  permissions: {
    spotTrading?: boolean;
    futuresTrading?: boolean;
    marginTrading?: boolean;
    withdraw?: boolean;
  } | null;

  @ApiProperty({ example: "2026-01-25T10:00:00Z", description: "검증 시각" })
  @Expose()
  verifiedAt: string;

  @ApiProperty({ required: false, description: "에러 메시지 (실패 시)" })
  @Expose()
  errorMessage?: string;
}
