import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AppointmentModality } from '@mykwatta/modules/listings/constants';

export class ScheduleAppointmentDto {
  @ApiProperty({
    example: '2026-11-10T10:00:00.000Z',
    description: 'Proposed viewing time (ISO 8601)',
  })
  @Type(() => Date)
  @IsDate()
  scheduledAt!: Date;

  @ApiPropertyOptional({ example: 30, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(240)
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 'Meet at the main gate' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  locationNote?: string;

  @ApiPropertyOptional({ example: 'Prefer morning if possible' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    enum: AppointmentModality,
    default: AppointmentModality.IN_PERSON,
  })
  @IsOptional()
  @IsEnum(AppointmentModality)
  modality?: AppointmentModality;

  @ApiPropertyOptional({
    example: 'https://meet.example.com/viewing',
    description: 'Required when modality is VIRTUAL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  meetingUrl?: string;
}

export class DeclineAppointmentDto {
  @ApiProperty({ example: 'That slot conflicts with another viewing' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
