import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ProfessionalKind } from '@mykwatta/modules/directory/constants/professional-kind';

export class ListProfessionalsQueryDto {
  @ApiPropertyOptional({ example: 'Yaoundé' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  city?: string;

  @ApiPropertyOptional({ enum: ProfessionalKind })
  @IsOptional()
  @IsEnum(ProfessionalKind)
  kind?: ProfessionalKind;
}
