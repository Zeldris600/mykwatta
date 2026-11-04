import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AssignLeadDto {
  @ApiProperty({ description: 'Organisation member who owns the lead' })
  @IsString()
  @MinLength(8)
  assigneeUserId!: string;
}
