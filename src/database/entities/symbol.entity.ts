import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from "typeorm";

/**
 * Symbol Entity
 * @description 범용 심볼/티커 관리 (암호화폐, 주식 등)
 */
@Entity({ name: "symbols", schema: "public" })
@Unique(["provider", "market", "symbol"])
export class SymbolEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  /**
   * Provider 식별자
   * @example binance, kis, bybit
   */
  @Column({ type: "varchar", length: 50 })
  @Index()
  provider: string;

  /**
   * 마켓 타입
   * @example futures_um, spot, kospi, nasdaq
   */
  @Column({ type: "varchar", length: 50 })
  @Index()
  market: string;

  /**
   * 심볼/티커
   * @example BTCUSDT, 005930, AAPL
   */
  @Column({ type: "varchar", length: 30 })
  @Index()
  symbol: string;

  /**
   * 종목명
   * @example Bitcoin/USDT, 삼성전자, Apple Inc.
   */
  @Column({ type: "varchar", length: 100, nullable: true })
  name: string | null;

  /**
   * 기초자산
   * @example BTC, null (주식의 경우)
   */
  @Column({ type: "varchar", length: 30, nullable: true })
  baseAsset: string | null;

  /**
   * 견적자산/통화
   * @example USDT, KRW, USD
   */
  @Column({ type: "varchar", length: 30, nullable: true })
  quoteAsset: string | null;

  /**
   * 거래 상태
   * @example TRADING, HALTED, DELISTED
   */
  @Column({ type: "varchar", length: 20, default: "TRADING" })
  status: string;

  /**
   * 자산 유형
   * @example crypto, stock, futures, option
   */
  @Column({ type: "varchar", length: 20, nullable: true })
  assetType: string | null;

  /**
   * 가격 소수점 자릿수
   */
  @Column({ type: "int", nullable: true })
  pricePrecision: number | null;

  /**
   * 수량 소수점 자릿수
   */
  @Column({ type: "int", nullable: true })
  quantityPrecision: number | null;

  /**
   * 최소 주문 금액
   */
  @Column({ type: "decimal", precision: 20, scale: 8, nullable: true })
  minNotional: string | null;

  /**
   * 추가 메타데이터 (JSONB)
   */
  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt: Date;
}
