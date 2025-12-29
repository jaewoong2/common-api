import { Body, Controller, HttpCode, HttpStatus, Param, Post, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CreateOrderDto, RefundOrderDto } from './dto/order.dto';
import { OrderService } from './services/order.service';
import { AppRequest } from '@common/interfaces/app-request.interface';

@ApiTags('billing')
@Controller('v1/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createOrder(@Body() body: CreateOrderDto, @Req() req: AppRequest) {
    const appId = req.appId ?? 'default';
    return this.orderService.createOrder(appId, body);
  }

  @Post(':orderId/refund')
  refundOrder(@Param('orderId') orderId: string, @Body() body: RefundOrderDto) {
    return this.orderService.refundOrder(orderId, body);
  }
}
