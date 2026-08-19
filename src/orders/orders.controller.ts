import { Controller, Inject, NotImplementedException, ParseUUIDPipe } from '@nestjs/common';
import { ClientProxy, EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from '@prisma/client';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto, PaidOrderDto } from './dto';
import { Console } from 'console';
//import { PRODUCT_SERVICE } from 'src/config/service';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService,
    
  ) {}

  @MessagePattern('createOrder')
  async create(@Payload() createOrderDto: CreateOrderDto) {
    console.log('Received createOrder message with data:', createOrderDto);
    console.log('Emitting validate_products event to product microservice ', createOrderDto.items.map(item => 
      item.productId,      
    ));
    
    const order = await this.ordersService.create(createOrderDto);

    const paymentSession = await this.ordersService.createPaymentSession(order);
    

    console.log('Created order:', order);
    return {order, paymentSession};
   
  }

  @MessagePattern('findAllOrders')
  findAll(@Payload() orderPaginationDto: OrderPaginationDto) {
    return this.ordersService.findAll(orderPaginationDto);
  }

  @MessagePattern('findOneOrder')
  findOne(@Payload('id', ParseUUIDPipe) id: string) {
    console.log('Received findOneOrder message with id:', id);
    return this.ordersService.findOne(id);
  }

  @MessagePattern('changeOrderStatus')
  changeOrderStatus(@Payload() changeOrderStatusDto: ChangeOrderStatusDto) {
     return this.ordersService.changeOrderStatus(changeOrderStatusDto.id, changeOrderStatusDto.status);
  }

  @EventPattern('payment.succeeded')
  paidOrder(@Payload() paidOrderDto: PaidOrderDto) {
    console.log('Received payment.succeeded event with data:', paidOrderDto);
    this.ordersService.paidOrder(paidOrderDto);
     //return this.ordersService.changeOrderStatus(changeOrderStatusDto.id, changeOrderStatusDto.status);
  }
}
