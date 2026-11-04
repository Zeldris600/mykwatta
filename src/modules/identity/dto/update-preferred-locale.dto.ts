import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const PREFERRED_LOCALES = ['en', 'fr'] as const;
export type PreferredLocale = (typeof PREFERRED_LOCALES)[number];

export class UpdatePreferredLocaleDto {
  @ApiProperty({ enum: PREFERRED_LOCALES })
  @IsIn(PREFERRED_LOCALES)
  preferredLocale!: PreferredLocale;
}
