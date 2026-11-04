import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MinLength } from 'class-validator';
import {
  KYC_DOCUMENT_TYPES,
  KycDocumentType,
} from '@mykwatta/modules/kyc/constants';

export class SubmitKycDto {
  @ApiProperty({
    enum: KYC_DOCUMENT_TYPES,
    example: KycDocumentType.NATIONAL_ID,
  })
  @IsEnum(KycDocumentType)
  documentType!: KycDocumentType;

  @ApiProperty({ example: 'CM123456789' })
  @IsString()
  @MinLength(4)
  documentNumber!: string;

  @ApiProperty({ example: 'Ada Mbarga' })
  @IsString()
  @MinLength(2)
  fullName!: string;
}
