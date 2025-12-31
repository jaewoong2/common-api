import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { WalletService } from "./wallet.service";
import {
  CreditWalletDto,
  DebitWalletDto,
  WalletBalanceQueryDto,
  WalletLedgerQueryDto,
} from "./dto/wallet.dto";
import { AppRequest } from "@common/interfaces/app-request.interface";
import { Roles } from "@common/decorators/roles.decorator";
import { UserRole } from "@common/enums";

@ApiTags('wallet')
@ApiBearerAuth()
@Roles(UserRole.APP_ADMIN)
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
