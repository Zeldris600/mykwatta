import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { MaintenanceTicketStatus } from '@mykwatta/modules/maintenance/constants';

export class UpdateMaintenanceTicketStatusDto {
  @ApiProperty({ enum: MaintenanceTicketStatus })
  @IsEnum(MaintenanceTicketStatus)
  status!: MaintenanceTicketStatus;
}
