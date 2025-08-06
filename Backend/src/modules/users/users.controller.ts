import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from 'src/casl/entities';
import { Action } from 'src/casl/enums/action.enum';
import { MESSAGE } from 'src/common/message';
import {
  CheckPolicies,
  CurrentUser,
  MessageResponse,
} from 'src/decorator/customize';
import { UploadedFileType } from 'src/interface/file-type.interface';
import { IUser } from 'src/interface/users.interface';
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

  @ApiOperation({
    summary: 'Update user avatar',
    description: 'Update user avatar image.',
  })
  @ApiBearerAuth()
  @CheckPolicies((ability) => ability.can(Action.Update, User))
  @ApiBody({
    type: 'multipart/form-data',
    description: 'User avatar image file',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @MessageResponse(MESSAGE.USER.AVATAR_UPDATE)
  @Patch(':id/avatar')
  async updateAvatar(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: 'image/jpeg|image/png|image/jpg',
        })
        .addMaxSizeValidator({
          maxSize: 2 * 1024 * 1024, // 2MB
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: UploadedFileType,
  ) {
    return this.usersService.updateAvatar(id, file);
  }

  @ApiOperation({
    summary: 'Get all users profile',
    description: 'Retrieve a list of all user profiles.',
  })
  @ApiBearerAuth()
  @CheckPolicies((ability) => ability.can(Action.ReadAll, User))
  @MessageResponse(MESSAGE.USER.FETCH_ALL)
  @Get()
  findAll(@CurrentUser() user: IUser) {
    return this.usersService.findAllUsers(user);
  }
}
