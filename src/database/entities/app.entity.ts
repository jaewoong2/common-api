import { Entity, Column } from "typeorm";
import { BaseEntity } from "../../core/database/base.entity";

/**
 * App Entity
 * @description Represents a tenant application in the multi-tenant system
 */
@Entity({ name: "apps", schema: "common" })
export class AppEntity extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({
    type: "varchar",
    length: 20,
    default: "ACTIVE",
  })
  status: "ACTIVE" | "SUSPENDED";

  // 이 앱으로 보낼 웹훅/콜백의 베이스 URL.
  @Column({
    name: "callback_base_url",
    type: "varchar",
    length: 512,
    nullable: true,
  })
  callbackBaseUrl: string | null;

  // 콜백으로 호출 가능한 경로 패턴 목록(화이트리스트) 저장용. 현재 코드에서는 단순 저장/수정만 하며, 향후 허용 경로 검증에 사용 예정인 설정 값입니다.
  @Column({ name: "callback_allowlist_paths", type: "jsonb", nullable: true })
  callbackAllowlistPaths: string[] | null;

  // 콜백 요청에 서명할 HMAC 시크릿의 저장 위치(또는 실제 시크릿).
  @Column({
    name: "callback_secret_ref",
    type: "varchar",
    length: 512,
    nullable: true,
  })
  callbackSecretRef: string | null;

  /**
   * Allowed redirect domains for OAuth flows
   * @description Whitelist of domains where OAuth can redirect after authentication
   * @example ["https://example.com", "https://app.example.com", "http://localhost:3000"]
   * @note Used for security validation to prevent open redirect vulnerabilities
   */
  @Column({
    name: "allowed_redirect_domains",
    type: "jsonb",
    nullable: true,
    default: () => "'[]'",
  })
  allowedRedirectDomains: string[] | null;
}
