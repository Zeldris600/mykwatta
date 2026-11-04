import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AssignMaintenanceTicketDto {
  @ApiProperty()
  @IsString()
  assigneeUserId!: string;
}
