import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus, PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { NATS_SERVICE } from 'src/config/service';
import { firstValueFrom } from 'rxjs';
import { Order } from './entities/order.entity';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit{

  private readonly logger = new Logger(OrdersService.name);

  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to the database');
  }

  async create(createOrderDto: CreateOrderDto) {
    console.log('Creating order with data:', createOrderDto);

    try {
      const products = await firstValueFrom(this.client.send({cmd: 'validate_products'}, createOrderDto.items.map(item => item.productId) ));
      console.log('Validated products:', products);

      const totalAmount = createOrderDto.items.reduce((total, item) => {
        const product = products.find(p => p.id === item.productId);
        return total + (product.price * item.quantity);
      }, 0);   

      const totalItems = createOrderDto.items.reduce((total, item) => total + item.quantity, 0);

      const order = await this.order.create({
        data: {
          totalAmount: totalAmount,
          totalItems: totalItems,
          OrderItems: {
            createMany: 
              {
                data: [
                  ...createOrderDto.items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: products.find(p => p.id === item.productId).price,
                  })),
                ]
              }
            ,
          },
        },
        include: {
          OrderItems: {
            select: {
              productId: true,
              quantity: true,
              price: true,              
            },
          },
        },
      });

      console.log('Total amount calculated:', totalAmount);

      return {...order, OrderItems: order.OrderItems.map(orderItem => ({
        ...orderItem,
        name: products.find(p => p.id === orderItem.productId).name,
      }))};
    } catch (error) {
      this.logger.error('Error validating products', error);
      throw new RpcException({status: error.status, message: error.message});
    }

    
    //return this.order.create({ data: createOrderDto });
    //return createOrderDto;
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {

    const totalPages = await this.order.count({
      where: {
        status: orderPaginationDto.status
      },
    });
    this.logger.log(`Total orders in database: ${totalPages}`);

    const currentPage = orderPaginationDto.page;
    const perPage = orderPaginationDto.limit;

    return {
      data: await this.order.findMany({
        where: {
          status: orderPaginationDto.status
        },
        skip: (currentPage - 1) * perPage,
        take: perPage,
      }),
      meta: {
        totalItems: totalPages,
        itemCount: Math.min(perPage, totalPages - (currentPage - 1) * perPage),
        totalPages: Math.ceil(totalPages / perPage),
        currentPage: currentPage,
      }
    }

    // return this.order.findMany({
    //   where: {
    //     status: orderPaginationDto.status
    //   },
    //   skip,
    //   take: pageSize,
    // });
  }

  async findOne(id: string) {
    console.log('Finding order with id:', id);
    const order = await this.order.findUnique({
      where: { id },
      include: {
        OrderItems: {
          select: {
            productId: true,
            quantity: true,
            price: true,
          },
        },
      },
    });

    if (!order) {
      throw new RpcException({status: HttpStatus.NOT_FOUND, message: `Order with id ${id} not found`});
    }

    const productIds = order.OrderItems.map(item => item.productId);
    console.log('Product IDs in order:', productIds);
    const products = await firstValueFrom(this.client.send({cmd: 'validate_products'}, order.OrderItems.map(item => item.productId) ));
        
    return {...order,
      OrderItems: order.OrderItems.map(orderItem => ({
        ...orderItem,
        name: products.find(p => p.id === orderItem.productId).name,
      }))
    };
  }

  update(id: number, updateOrderDto: UpdateOrderDto) {
    return `This action updates a #${id} order`;
  }

  remove(id: number) {
    return `This action removes a #${id} order`;
  }

  async changeOrderStatus(id: string, status: OrderStatus) {
    const order = await this.order.findUnique({
      where: { id },
    });
    if (!order) {
      throw new RpcException({status: HttpStatus.NOT_FOUND, message: `Order with id ${id} not found`});
    }
    return this.order.update({
      where: { id },
      data: { status },
    });
  }
}
