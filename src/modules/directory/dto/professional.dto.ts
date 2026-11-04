import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PROFESSIONAL_KINDS,
  ProfessionalKind,
} from '@mykwatta/modules/directory/constants/professional-kind';

export class CreateProfessionalDto {
  @ApiProperty({ enum: PROFESSIONAL_KINDS, example: ProfessionalKind.NOTAIRE })
  @IsEnum(ProfessionalKind)
  kind!: ProfessionalKind;

  @ApiProperty({ example: 'Etude Me. Nkolo' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'Yaoundé' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  city!: string;

  @ApiPropertyOptional({ example: '+237600000000' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ example: 'etude@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}

export class UpdateProfessionalDto {
  @ApiPropertyOptional({ enum: PROFESSIONAL_KINDS })
  @IsOptional()
  @IsEnum(ProfessionalKind)
  kind?: ProfessionalKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}
