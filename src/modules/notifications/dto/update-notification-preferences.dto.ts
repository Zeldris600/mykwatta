import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import {
  NotificationChannel,
  NotificationType,
} from '@mykwatta/modules/notifications/constants';

export class NotificationChannelPreferencesDto implements Partial<
  Record<NotificationChannel, boolean>
> {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  PUSH?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  IN_APP?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  WHATSAPP?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  EMAIL?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  SMS?: boolean;
}

/** Partial per-type toggles — only provided keys are updated. */
export class NotificationTypePreferencesDto implements Partial<
  Record<NotificationType, boolean>
> {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  INQUIRY_CREATED?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  INQUIRY_RESPONDED?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  APPOINTMENT_REQUESTED?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  APPOINTMENT_CONFIRMED?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  APPOINTMENT_DECLINED?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  APPOINTMENT_CANCELLED?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  PAYMENT_SUCCEEDED?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  PAYMENT_FAILED?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  APPLICATION_SUBMITTED?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  APPLICATION_ACCEPTED?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  APPLICATION_REJECTED?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  DEAL_COMPLETED?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  DEAL_CANCELLED?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  MAINTENANCE_TICKET_CREATED?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  MAINTENANCE_TICKET_ASSIGNED?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  MAINTENANCE_TICKET_STATUS_CHANGED?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  RENT_REMINDER?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  LEASE_RENEWAL_NOTICE?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  VENDOR_LEAD_SENT?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  SAVED_SEARCH_MATCH?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  LEAD_SLA_BREACH?: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({
    description:
      'Channel consent: PUSH, IN_APP, WHATSAPP, EMAIL, SMS. Partial patch.',
    type: NotificationChannelPreferencesDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationChannelPreferencesDto)
  channels?: NotificationChannelPreferencesDto;

  @ApiPropertyOptional({
    description:
      'Per-type toggles. `false` skips every channel for that type. Partial patch.',
    type: NotificationTypePreferencesDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationTypePreferencesDto)
  types?: NotificationTypePreferencesDto;
}
