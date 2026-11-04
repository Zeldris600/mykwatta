import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn } from 'class-validator';
import {
  TITLE_DOCUMENT_TYPES,
  TitleDocumentStatus,
  TitleDocumentType,
} from '@mykwatta/modules/listings/constants';

export class UploadTitleDocumentDto {
  @ApiProperty({
    enum: TITLE_DOCUMENT_TYPES,
    example: TitleDocumentType.TITRE_FONCIER,
  })
  @IsEnum(TitleDocumentType)
  documentType!: TitleDocumentType;
}

const REVIEW_DECISIONS = [
  TitleDocumentStatus.APPROVED,
  TitleDocumentStatus.REJECTED,
] as const;

export class ReviewTitleDocumentDto {
  @ApiProperty({
    enum: REVIEW_DECISIONS,
    example: TitleDocumentStatus.APPROVED,
  })
  @IsIn(REVIEW_DECISIONS)
  status!: (typeof REVIEW_DECISIONS)[number];
}
