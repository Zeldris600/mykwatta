import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetDocumentsVerifiedDto {
  @ApiProperty()
  @IsBoolean()
  verified!: boolean;
}
