import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrgDocumentType } from '@mykwatta/modules/identity/constants/org-document-type';

export class UploadOrgDocumentDto {
  @ApiProperty({ enum: OrgDocumentType })
  @IsEnum(OrgDocumentType)
  documentType!: OrgDocumentType;
}
