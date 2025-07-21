import { Body, Controller, Param, Patch, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from 'src/casl/entities';
import { Action } from 'src/casl/enums/action.enum';
import { MESSAGE } from 'src/common/message';
import { CheckPolicies, MessageResponse } from 'src/decorator/customize';
import { UsersService } from 'src/modules/users/users.service';
import { UpdateStatusDto, UpdateUserDto } from './dto/update-user.dto';

@ApiTags('User Profile')
@Controller('profile')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: 'Update user profile',
    description: 'Update user profile information with no avatar.',
  })
  @ApiBearerAuth()
  @CheckPolicies((ability) => ability.can(Action.Update, User))
  @ApiBody({
    type: UpdateUserDto,
    description: 'User profile data with no avatar upload',
  })
  @CheckPolicies((ability) => ability.can(Action.Update, User))
  @MessageResponse(MESSAGE.USER.PROFILE_UPDATE)
  @Patch(':id')
  updateProfile(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(id, updateProfileDto);
  }

  @ApiOperation({
    summary: 'Update user status',
    description: 'Update the status of a user account.',
  })
  @ApiBearerAuth()
  @CheckPolicies((ability) => ability.can(Action.Update, User))
  @ApiBody({
    type: UpdateStatusDto,
    description: 'User status data',
  })
  @MessageResponse(MESSAGE.USER.STATUS_UPDATE)
  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.usersService.updateStatus(id, updateStatusDto);
  }
}
