import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SymbolEntity } from "../../../database/entities";

/**
 * Symbol DTO
 */
export interface SymbolDto {
  id: number;
  provider: string;
  market: string;
  symbol: string;
  name: string | null;
  baseAsset: string | null;
  quoteAsset: string | null;
  status: string;
  assetType: string | null;
  pricePrecision: number | null;
  quantityPrecision: number | null;
}

/**
 * Symbol Filter
 */
export interface SymbolFilter {
  provider?: string;
  market?: string;
  status?: string;
  assetType?: string;
}

/**
 * Symbol Create Input
 */
export interface SymbolCreateInput {
  provider: string;
  market: string;
  symbol: string;
  name?: string | null;
  baseAsset?: string | null;
  quoteAsset?: string | null;
  status?: string;
  assetType?: string | null;
  pricePrecision?: number | null;
  quantityPrecision?: number | null;
  minNotional?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Symbol Repository
 * @description Symbol CRUD 및 조회
 */
@Injectable()
export class SymbolRepository {
  constructor(
    @InjectRepository(SymbolEntity)
    private readonly repo: Repository<SymbolEntity>,
  ) {}

  /**
   * 심볼 목록 조회
   */
  async findAll(filter: SymbolFilter = {}): Promise<SymbolDto[]> {
    const where: Record<string, unknown> = {};

    if (filter.provider) where.provider = filter.provider;
    if (filter.market) where.market = filter.market;
    if (filter.status) where.status = filter.status;
    if (filter.assetType) where.assetType = filter.assetType;

    const entities = await this.repo.find({
      where,
      order: { symbol: "ASC" },
    });

    return entities.map((e) => this.toDto(e));
  }

  /**
   * 심볼 코드만 조회 (티커 목록용)
   */
  async findSymbolCodes(
    provider: string,
    market: string,
    status: string = "TRADING",
  ): Promise<string[]> {
    const entities = await this.repo.find({
      where: { provider, market, status },
      select: ["symbol"],
      order: { symbol: "ASC" },
    });

    return entities.map((e) => e.symbol);
  }

  /**
   * 심볼 조회 (단일)
   */
  async findOne(
    provider: string,
    market: string,
    symbol: string,
  ): Promise<SymbolDto | null> {
    const entity = await this.repo.findOne({
      where: { provider, market, symbol },
    });

    return entity ? this.toDto(entity) : null;
  }

  /**
   * 심볼 생성 또는 업데이트 (Upsert)
   */
  async upsert(input: SymbolCreateInput): Promise<SymbolDto> {
    const existing = await this.repo.findOne({
      where: {
        provider: input.provider,
        market: input.market,
        symbol: input.symbol,
      },
    });

    if (existing) {
      // Update
      await this.repo.update(existing.id, {
        name: input.name ?? existing.name,
        baseAsset: input.baseAsset ?? existing.baseAsset,
        quoteAsset: input.quoteAsset ?? existing.quoteAsset,
        status: input.status ?? existing.status,
        assetType: input.assetType ?? existing.assetType,
        pricePrecision: input.pricePrecision ?? existing.pricePrecision,
        quantityPrecision:
          input.quantityPrecision ?? existing.quantityPrecision,
        minNotional: input.minNotional ?? existing.minNotional,
        metadata: input.metadata ?? existing.metadata,
      });

      const updated = await this.repo.findOneOrFail({
        where: { id: existing.id },
      });
      return this.toDto(updated);
    } else {
      // Create
      const entity = this.repo.create(input);
      const saved = await this.repo.save(entity);
      return this.toDto(saved);
    }
  }

  /**
   * 배치 Upsert (대량 업데이트용)
   */
  async batchUpsert(
    inputs: SymbolCreateInput[],
  ): Promise<{ added: number; updated: number }> {
    let added = 0;
    let updated = 0;

    for (const input of inputs) {
      const existing = await this.repo.findOne({
        where: {
          provider: input.provider,
          market: input.market,
          symbol: input.symbol,
        },
      });

      if (existing) {
        await this.repo.update(existing.id, {
          name: input.name ?? existing.name,
          baseAsset: input.baseAsset ?? existing.baseAsset,
          quoteAsset: input.quoteAsset ?? existing.quoteAsset,
          status: input.status ?? existing.status,
          assetType: input.assetType ?? existing.assetType,
          pricePrecision: input.pricePrecision ?? existing.pricePrecision,
          quantityPrecision:
            input.quantityPrecision ?? existing.quantityPrecision,
          minNotional: input.minNotional ?? existing.minNotional,
          metadata: input.metadata ?? existing.metadata,
        });
        updated++;
      } else {
        const entity = this.repo.create(input);
        await this.repo.save(entity);
        added++;
      }
    }

    return { added, updated };
  }

  /**
   * 심볼 삭제
   */
  async delete(
    provider: string,
    market: string,
    symbol: string,
  ): Promise<boolean> {
    const result = await this.repo.delete({ provider, market, symbol });
    return (result.affected ?? 0) > 0;
  }

  /**
   * 심볼 카운트
   */
  async count(filter: SymbolFilter = {}): Promise<number> {
    const where: Record<string, unknown> = {};

    if (filter.provider) where.provider = filter.provider;
    if (filter.market) where.market = filter.market;
    if (filter.status) where.status = filter.status;

    return this.repo.count({ where });
  }

  private toDto(entity: SymbolEntity): SymbolDto {
    return {
      id: entity.id,
      provider: entity.provider,
      market: entity.market,
      symbol: entity.symbol,
      name: entity.name,
      baseAsset: entity.baseAsset,
      quoteAsset: entity.quoteAsset,
      status: entity.status,
      assetType: entity.assetType,
      pricePrecision: entity.pricePrecision,
      quantityPrecision: entity.quantityPrecision,
    };
  }
}
