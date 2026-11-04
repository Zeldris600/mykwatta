import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ListProfessionalsQueryDto } from '@mykwatta/modules/directory/dto';
import { DirectoryService } from '@mykwatta/modules/directory/services/directory.service';

@ApiTags('directory')
@Controller('directory/professionals')
export class DirectoryController {
  constructor(private readonly directory: DirectoryService) {}

  @Get()
  @AllowAnonymous()
  list(@Query() query: ListProfessionalsQueryDto) {
    return this.directory.listPublic(query);
  }
}
