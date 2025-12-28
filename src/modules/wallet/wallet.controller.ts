import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { WalletService } from "./wallet.service";
import {
  CreditWalletDto,
  DebitWalletDto,
  WalletBalanceQueryDto,
  WalletLedgerQueryDto,
} from "./dto/wallet.dto";

@UseGuards(RolesGuard)
@Controller("v1/wallet")
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post("credits")
  credit(@Body() body: CreditWalletDto) {
    return this.walletService.credit(body);
  }

  @Post("debits")
  debit(@Body() body: DebitWalletDto) {
    return this.walletService.debit(body);
  }

  @Get("balance")
  @HttpCode(HttpStatus.OK)
  balance(@Query() query: WalletBalanceQueryDto) {
    return this.walletService.getBalance(query);
  }

  @Get("ledger")
  ledger(@Query() query: WalletLedgerQueryDto) {
    return this.walletService.getLedger(query);
  }
}
