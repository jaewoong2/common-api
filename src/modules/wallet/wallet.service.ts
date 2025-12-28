import { Injectable, NotImplementedException } from "@nestjs/common";
import {
  CreditWalletDto,
  DebitWalletDto,
  WalletBalanceQueryDto,
  WalletLedgerQueryDto,
} from "./dto/wallet.dto";

@Injectable()
export class WalletService {
  /**
   * Credits a wallet with the specified amount and trace fields.
   */
  credit(body: CreditWalletDto) {
    throw new NotImplementedException(
      `Credit wallet ${body.user_id} amount ${body.amount}`
    );
  }

  /**
   * Debits a wallet using FIFO consumption rules.
   */
  debit(body: DebitWalletDto) {
    throw new NotImplementedException(
      `Debit wallet ${body.user_id} amount ${body.amount}`
    );
  }

  /**
   * Returns current balance for a user.
   */
  getBalance(query: WalletBalanceQueryDto) {
    throw new NotImplementedException(`Get balance for ${query.user_id}`);
  }

  /**
   * Returns ledger entries with pagination.
   */
  getLedger(query: WalletLedgerQueryDto) {
    throw new NotImplementedException(`Get ledger for ${query.user_id}`);
  }
}
