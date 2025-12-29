import { Injectable } from "@nestjs/common";
import {
  CreditWalletDto,
  DebitWalletDto,
  WalletBalanceQueryDto,
  WalletLedgerQueryDto,
} from "./dto/wallet.dto";
import { PointService } from "../point/point.service";
import { WalletReason } from "../../common/enums";

@Injectable()
export class WalletService {
  constructor(private readonly pointService: PointService) {}

  /**
   * Credits a wallet with the specified amount and trace fields.
   */
  async credit(appId: string, body: CreditWalletDto) {
    const expiresAt = body.expires_at ? new Date(body.expires_at) : undefined;

    return this.pointService.creditWallet(
      appId,
      body.user_id,
      body.amount.toString(),
      body.reason as WalletReason,
      body.ref_type,
      body.ref_id,
      expiresAt,
      body.idempotency_key,
    );
  }

  /**
   * Debits a wallet using FIFO consumption rules.
   */
  async debit(appId: string, body: DebitWalletDto) {

    return this.pointService.debitWallet(
      appId,
      body.user_id,
      body.amount.toString(),
      body.reason as WalletReason,
      body.ref_type,
      body.ref_id,
      body.idempotency_key,
    );
  }

  /**
   * Returns current balance for a user.
   */
  async getBalance(query: WalletBalanceQueryDto) {
    return this.pointService.getBalance(query.user_id);
  }

  /**
   * Returns ledger entries with pagination.
   */
  async getLedger(query: WalletLedgerQueryDto) {
    return this.pointService.getLedger(
      query.user_id,
      query.limit || 20,
      0, // offset - cursor pagination not implemented in PointService yet
    );
  }
}
