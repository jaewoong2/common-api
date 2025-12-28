import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ProductService } from './services/product.service';

@UseGuards(RolesGuard)
@Controller()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get('v1/products')
  listProducts() {
    return this.productService.listProducts();
  }

  @Post('v1/admin/products')
  @Roles('APP_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  createProduct(@Body() body: CreateProductDto) {
    return this.productService.createProduct(body);
  }

  @Patch('v1/admin/products/:productId')
  @Roles('APP_ADMIN')
  updateProduct(@Param('productId') productId: string, @Body() body: UpdateProductDto) {
    return this.productService.updateProduct(productId, body);
  }
}
