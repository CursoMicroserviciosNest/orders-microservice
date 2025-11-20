import { OrderStatus } from "generated/prisma/enums";

import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsPositive, ValidateNested } from "class-validator";
//import { OrderStatusList } from "../enum/order.enum";
import { Type } from "class-transformer";
import { CreateOrderItemDto } from "./create-order-item.dto";

export class CreateOrderDto {
    // @IsNumber()
    // @IsPositive()
    // totalAmount: number;

    // @IsNumber()
    // @IsPositive()
    // totalItems: number;

    // @IsEnum(OrderStatusList, {
    //     message: `Status must be one of the following values: ${Object.values(OrderStatusList).join(", ")}`,
    // })
    // @IsOptional()
    // status: OrderStatus = OrderStatus.PENDING;

    // @IsOptional()
    // @IsBoolean()
    // paid: boolean = false;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreateOrderItemDto)
    items: CreateOrderItemDto[];
}