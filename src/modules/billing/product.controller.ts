import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ProductService } from './services/product.service';
import { AppRequest } from '@common/interfaces/app-request.interface';

@ApiTags('billing')
@UseGuards(RolesGuard)
@Controller()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get('v1/products')
  listProducts(@Req() req: AppRequest) {
    const appId = req.appId ?? 'default';
    return this.productService.listProducts(appId);
  }

  @Post('v1/admin/products')
  @Roles('APP_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  createProduct(@Body() body: CreateProductDto, @Req() req: AppRequest) {
    const appId = req.appId ?? 'default';
    return this.productService.createProduct(appId, body);
  }

  @Patch('v1/admin/products/:productId')
  @Roles('APP_ADMIN')
  updateProduct(@Param('productId') productId: string, @Body() body: UpdateProductDto) {
    return this.productService.updateProduct(productId, body);
  }
}
