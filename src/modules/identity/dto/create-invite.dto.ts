import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum } from 'class-validator';
import {
  INVITABLE_ROLES,
  OrganisationRole,
} from '@mykwatta/modules/identity/constants';

export class CreateInviteDto {
  @ApiProperty({ example: 'agent@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    enum: INVITABLE_ROLES,
    example: OrganisationRole.AGENT,
  })
  @IsEnum(INVITABLE_ROLES)
  role!: OrganisationRole;
}
