import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { CatalogsService } from '@mykwatta/modules/catalogs/services/catalogs.service';

@ApiTags('catalogs')
@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogs: CatalogsService) {}

  @Get('amenities')
  @AllowAnonymous()
  listAmenities() {
    return this.catalogs.listAmenities();
  }

  @Get('landmarks')
  @AllowAnonymous()
  listLandmarks() {
    return this.catalogs.listLandmarks();
  }
}
