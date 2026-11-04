import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/** Body fields sent by the Pusher JS client (form-urlencoded or JSON). */
export class PusherAuthDto {
  @ApiProperty({ example: '1234.5678' })
  @IsString()
  @MinLength(1)
  socket_id!: string;

  @ApiProperty({ example: 'private-user-abc123' })
  @IsString()
  @MinLength(1)
  channel_name!: string;
}
