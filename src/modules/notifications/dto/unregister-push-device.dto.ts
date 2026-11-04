import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UnregisterPushDeviceDto {
  @ApiProperty({ description: 'FCM or APNs token to remove' })
  @IsString()
  @MinLength(8)
  token!: string;
}
