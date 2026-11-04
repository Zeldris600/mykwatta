import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CompsQueryDto } from '@mykwatta/modules/comps/dto';
import { CompsService } from '@mykwatta/modules/comps/services';

@ApiTags('comps')
@Controller('comps')
export class CompsController {
  constructor(private readonly comps: CompsService) {}

  @Get('query')
  query(@Query() query: CompsQueryDto) {
    return this.comps.query(query);
  }
}
