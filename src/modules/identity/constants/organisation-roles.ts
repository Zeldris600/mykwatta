/**
 * Roles inside an organisation (agencies, portfolios).
 * Not assigned at signup — only via membership.
 */
export enum OrganisationRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  PROPERTY_MANAGER = 'PROPERTY_MANAGER',
  AGENT = 'AGENT',
  ACCOUNTANT = 'ACCOUNTANT',
  CARETAKER = 'CARETAKER',
  MEMBER = 'MEMBER',
}

export const ORGANISATION_ROLES = Object.values(OrganisationRole) as [
  OrganisationRole,
  ...OrganisationRole[],
];

export function isOrganisationRole(value: string): value is OrganisationRole {
  return (ORGANISATION_ROLES as string[]).includes(value);
}

/** Roles that may create / revoke membership invites. */
export const INVITE_MANAGER_ROLES: readonly OrganisationRole[] = [
  OrganisationRole.OWNER,
  OrganisationRole.ADMIN,
];

/** Roles that can be assigned via invite (owner is created with the org). */
export const INVITABLE_ROLES = ORGANISATION_ROLES.filter(
  (role) => role !== OrganisationRole.OWNER,
) as [OrganisationRole, ...OrganisationRole[]];

export function canManageInvites(role: OrganisationRole): boolean {
  return INVITE_MANAGER_ROLES.includes(role);
}
