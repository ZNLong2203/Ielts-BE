import { Body, Controller, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Action } from 'src/casl/casl.interface';
import * as ISubject from 'src/casl/subject.interface';
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
  @CheckPolicies((ability) => ability.can(Action.Update, ISubject.User))
  @ApiBody({
    type: UpdateUserDto,
    description: 'User profile data with no avatar upload',
  })
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
  @CheckPolicies((ability) => ability.can(Action.Update, ISubject.User))
  @ApiBody({
    type: UpdateStatusDto,
    description: 'User status data',
  })
  @MessageResponse(MESSAGE.USER.STATUS_UPDATE)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.usersService.updateStatus(id, updateStatusDto);
  }
}
