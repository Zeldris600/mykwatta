/**
 * Account-level personas. A user may hold many at once.
 * Organisation roles are separate and only apply when the user
 * creates or joins an organisation — never required at signup.
 */
export enum Persona {
  RENTER = 'RENTER',
  BUYER = 'BUYER',
  LANDLORD = 'LANDLORD',
  AGENT = 'AGENT',
  CARETAKER = 'CARETAKER',
  CONSTRUCTION_CLIENT = 'CONSTRUCTION_CLIENT',
  DEVELOPER = 'DEVELOPER',
  INVESTOR = 'INVESTOR',
  /** Internal staff — KYC review and platform ops. Not a signup default. */
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
}

export const PERSONAS = Object.values(Persona) as [Persona, ...Persona[]];

/** Personas selectable at signup / self-serve profile (excludes staff). */
export const SIGNUP_PERSONAS = PERSONAS.filter(
  (persona) => persona !== Persona.PLATFORM_ADMIN,
) as [Persona, ...Persona[]];

export function isPersona(value: string): value is Persona {
  return (PERSONAS as string[]).includes(value);
}
