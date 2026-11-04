import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OptionalAuth } from '@thallesp/nestjs-better-auth';
import { GeoService } from '@mykwatta/modules/geo/services/geo.service';

@ApiTags('geo')
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get('cities')
  @OptionalAuth()
  listCities() {
    return this.geoService.listCities();
  }

  @Get('cities/:cityId/quartiers')
  @OptionalAuth()
  listQuartiers(@Param('cityId') cityId: string) {
    return this.geoService.listQuartiersByCity(cityId);
  }

  @Get('quartiers.geojson')
  @OptionalAuth()
  quartiersGeoJson() {
    return this.geoService.quartiersFeatureCollection();
  }
}
