import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CreateOrderDto, RefundOrderDto } from './dto/order.dto';
import { OrderService } from './services/order.service';

@Controller('v1/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createOrder(@Body() body: CreateOrderDto) {
    return this.orderService.createOrder(body);
  }

  @Post(':orderId/refund')
  refundOrder(@Param('orderId') orderId: string, @Body() body: RefundOrderDto) {
    return this.orderService.refundOrder(orderId, body);
  }
}
