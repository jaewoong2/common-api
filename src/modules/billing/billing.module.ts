import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderController } from './order.controller';
import { ProductController } from './product.controller';
import { OrderService } from './services/order.service';
import { ProductService } from './services/product.service';
import { ProductRepository } from './repositories/product.repository';
import { OrderRepository } from './repositories/order.repository';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ProductEntity } from '../../database/entities/product.entity';
import { OrderEntity } from '../../database/entities/order.entity';
import { PointModule } from '../point/point.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductEntity, OrderEntity]),
    PointModule,
  ],
  controllers: [ProductController, OrderController],
  providers: [ProductService, OrderService, ProductRepository, OrderRepository, RolesGuard],
  exports: [ProductService, OrderService, ProductRepository, OrderRepository],
})
export class BillingModule {}
