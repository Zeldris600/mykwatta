import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import {
  CreateProfessionalDto,
  UpdateProfessionalDto,
} from '@mykwatta/modules/directory/dto';
import { DirectoryService } from '@mykwatta/modules/directory/services/directory.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/directory/professionals')
export class AdminDirectoryController {
  constructor(private readonly directory: DirectoryService) {}

  @Get()
  list(@Session() session: UserSession) {
    return this.directory.listForAdmin(session.user.id);
  }

  @Post()
  create(@Session() session: UserSession, @Body() body: CreateProfessionalDto) {
    return this.directory.create(session.user.id, body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Session() session: UserSession,
    @Body() body: UpdateProfessionalDto,
  ) {
    return this.directory.update(id, session.user.id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Session() session: UserSession) {
    return this.directory.remove(id, session.user.id);
  }
}
