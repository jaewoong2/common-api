import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { RolesGuard } from "../../common/guards/roles.guard";
import { WalletService } from "./wallet.service";
import {
  CreditWalletDto,
  DebitWalletDto,
  WalletBalanceQueryDto,
  WalletLedgerQueryDto,
} from "./dto/wallet.dto";
import { AppRequest } from "@common/interfaces/app-request.interface";

@ApiTags('wallet')
@UseGuards(RolesGuard)
@Controller("v1/wallet")
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post("credits")
  credit(@Body() body: CreditWalletDto, @Req() req: AppRequest) {
    const appId = req.appId ?? "default";
    return this.walletService.credit(appId, body);
  }

  @Post("debits")
  debit(@Body() body: DebitWalletDto, @Req() req: AppRequest) {
    const appId = req.appId ?? "default";
    return this.walletService.debit(appId, body);
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
