import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RespondInquiryDto {
  @ApiProperty({
    example: 'Yes — we can arrange a viewing on Saturday at 10am.',
  })
  @IsString()
  @MinLength(5)
  responseMessage!: string;
}
