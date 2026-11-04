import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import {
  PUSH_PLATFORMS,
  PushPlatform,
} from '@mykwatta/modules/notifications/constants';

export class RegisterPushDeviceDto {
  @ApiProperty({ enum: PUSH_PLATFORMS })
  @IsEnum(PushPlatform)
  platform!: PushPlatform;

  @ApiProperty({ description: 'FCM registration token or APNs device token' })
  @IsString()
  @MinLength(8)
  token!: string;

  @ApiPropertyOptional({
    description: 'Optional stable device id for token rotation',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  deviceId?: string;
}
