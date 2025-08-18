import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { CurrentUser, SkipCheckPermission } from 'src/decorator/customize';
import { IUser } from 'src/interface/users.interface';
import { CreateOrderDto } from 'src/modules/orders/dto/create-order.dto';
import { UpdateOrderStatusDto } from 'src/modules/orders/dto/update-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create order from combo' })
  @SkipCheckPermission()
  async create(@CurrentUser() user: IUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List orders' })
  async list(@Query() query: PaginationQueryDto, @Req() req: Request) {
    return this.ordersService.listOrders(query, req.query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details' })
  async get(@Param('id') id: string) {
    return this.ordersService.getOrder(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel order' })
  async cancel(@Param('id') id: string) {
    return this.ordersService.cancelOrder(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status (admin)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete order' })
  async remove(@Param('id') id: string) {
    await this.ordersService.softDelete(id);
    return;
  }
}
