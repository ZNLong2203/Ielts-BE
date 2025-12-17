import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { User } from 'src/casl/entities';
import {
  canApplyCoupon,
  canCreateCoupon,
  canDeleteCoupon,
  canUpdateCoupon,
} from 'src/casl/policies/coupon.policies';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { MESSAGE } from 'src/common/message';
import {
  CheckPolicies,
  CurrentUser,
  MessageResponse,
  SkipCheckPermission,
} from 'src/decorator/customize';
import { CouponsService } from 'src/modules/coupons/coupons.service';
import {
  ApplyCouponDto,
  CreateCouponDto,
  ValidateCouponDto,
} from 'src/modules/coupons/dto/create-coupon.dto';
import { UpdateCouponDto } from 'src/modules/coupons/dto/update-coupon.dto';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new coupon' })
  @ApiBearerAuth()
  @CheckPolicies(canCreateCoupon)
  @MessageResponse(MESSAGE.COUPON.CREATE_SUCCESS)
  async create(
    @Body() createCouponDto: CreateCouponDto,
    @CurrentUser() user: User,
  ) {
    return this.couponsService.create(createCouponDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all coupons with pagination and filters' })
  @ApiBearerAuth()
  @CheckPolicies(canCreateCoupon) // Only admins can list all coupons
  async findAll(@Query() query: PaginationQueryDto, @Req() req: Request) {
    return this.couponsService.findAll(query, req.query);
  }

  @Get('available')
  @ApiOperation({
    summary: 'Get available coupons for current user and selected courses',
  })
  @ApiBearerAuth()
  @SkipCheckPermission()
  @ApiQuery({ name: 'courseIds', required: true, type: [String] })
  async getAvailableCoupons(
    @CurrentUser() user: User,
    @Query('courseIds') courseIds: string[],
  ) {
    return this.couponsService.getAvailableCouponsForUser(
      user.id,
      Array.isArray(courseIds) ? courseIds : [courseIds],
    );
  }

  @Get('history')
  @ApiOperation({ summary: 'Get coupon usage history for current user' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getCouponHistory(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.couponsService.getUserCouponHistory(user.id, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get coupon by ID' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @CheckPolicies(canCreateCoupon) // Only admins can view coupon details
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.couponsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update coupon' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @CheckPolicies(canUpdateCoupon)
  @MessageResponse(MESSAGE.COUPON.UPDATE_SUCCESS)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCouponDto: UpdateCouponDto,
  ) {
    return this.couponsService.update(id, updateCouponDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete coupon' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @CheckPolicies(canDeleteCoupon)
  @MessageResponse(MESSAGE.COUPON.DELETE_SUCCESS)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.couponsService.remove(id);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate a coupon code' })
  @ApiBearerAuth()
  @SkipCheckPermission()
  async validate(
    @Body() validateCouponDto: ValidateCouponDto,
    @CurrentUser() user: User,
  ) {
    return this.couponsService.validateCoupon(validateCouponDto, user.id);
  }

  @Post('apply')
  @ApiOperation({
    summary:
      'Apply coupon to order (usually called internally by Orders service)',
    description:
      'This endpoint is typically not called directly, but from OrdersService',
  })
  @ApiBearerAuth()
  @CheckPolicies(canApplyCoupon)
  async apply(
    @Body() applyCouponDto: ApplyCouponDto,
    @Body('orderId') orderId: string,
    @Body('totalAmount') totalAmount: number,
    @CurrentUser() user: User,
  ) {
    return this.couponsService.applyCoupon(
      applyCouponDto,
      user.id,
      orderId,
      totalAmount,
    );
  }
}
