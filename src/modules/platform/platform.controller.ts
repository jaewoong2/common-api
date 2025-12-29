import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateAppDto, UpdateAppDto } from './dto/app.dto';
import { PlatformService } from './platform.service';

@ApiTags('platform')
@UseGuards(RolesGuard)
@Roles('PLATFORM_SUPER_ADMIN')
@Controller('v1/platform/apps')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get()
  listApps() {
    return this.platformService.listApps();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createApp(@Body() body: CreateAppDto) {
    return this.platformService.createApp(
      body.name,
      body.callback_base_url,
      body.callback_allowlist_paths,
    );
  }

  @Patch(':appId')
  updateApp(@Param('appId') appId: string, @Body() body: UpdateAppDto) {
    return this.platformService.updateApp(appId, {
      name: body.callback_base_url ? undefined : undefined,
      callbackBaseUrl: body.callback_base_url,
      callbackAllowlistPaths: body.callback_allowlist_paths,
      callbackSecretRef: body.callback_secret_ref,
    });
  }
}
