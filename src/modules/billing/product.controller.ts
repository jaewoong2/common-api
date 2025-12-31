import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ProductService } from './services/product.service';
import { AppRequest } from '@common/interfaces/app-request.interface';
import { UserRole } from '@common/enums';

@ApiTags('billing')
@ApiBearerAuth()
@Controller()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get('v1/products')
  listProducts(@Req() req: AppRequest) {
    const appId = req.appId ?? 'default';
    return this.productService.listProducts(appId);
  }

  @Post('v1/admin/products')
  @Roles(UserRole.APP_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  createProduct(@Body() body: CreateProductDto, @Req() req: AppRequest) {
    const appId = req.appId ?? 'default';
    return this.productService.createProduct(appId, body);
  }

  @Patch('v1/admin/products/:productId')
  @Roles(UserRole.APP_ADMIN)
  updateProduct(@Param('productId') productId: string, @Body() body: UpdateProductDto) {
    return this.productService.updateProduct(productId, body);
  }
}
