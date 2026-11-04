import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, ArrayUnique, IsArray, IsEnum } from 'class-validator';
import { Persona, SIGNUP_PERSONAS } from '@mykwatta/modules/identity/constants';

export class UpdatePersonasDto {
  @ApiProperty({
    isArray: true,
    enum: SIGNUP_PERSONAS,
    example: [Persona.RENTER, Persona.LANDLORD],
    description: 'Replace the account persona set (at least one required).',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(SIGNUP_PERSONAS, { each: true })
  @Type(() => String)
  personas!: Persona[];
}
