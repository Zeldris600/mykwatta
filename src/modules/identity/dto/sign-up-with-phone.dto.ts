import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Persona, SIGNUP_PERSONAS } from '@mykwatta/modules/identity/constants';

export class SignUpWithPhoneDto {
  @ApiProperty({ example: '+237612345678' })
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'phoneNumber must be E.164 (e.g. +237612345678)',
  })
  phoneNumber!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(4)
  code!: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Ada Mbarga' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({
    isArray: true,
    enum: SIGNUP_PERSONAS,
    example: [Persona.RENTER],
    description:
      'One or more account personas. Organisation membership is optional and separate.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(SIGNUP_PERSONAS, { each: true })
  @Type(() => String)
  personas!: Persona[];
}
