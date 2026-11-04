import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { ProfessionalKind } from '@mykwatta/modules/directory/constants/professional-kind';

export const professionalKindEnum = pgEnum(
  'professional_kind',
  Object.values(ProfessionalKind) as [ProfessionalKind, ...ProfessionalKind[]],
);

export const directoryProfessionals = pgTable(
  'directory_professionals',
  {
    id: text('id').primaryKey(),
    kind: professionalKindEnum('kind').notNull(),
    name: text('name').notNull(),
    city: text('city').notNull(),
    phone: text('phone'),
    email: text('email'),
    verified: boolean('verified').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('directory_professionals_city_idx').on(table.city),
    index('directory_professionals_kind_idx').on(table.kind),
    index('directory_professionals_verified_idx').on(table.verified),
  ],
);
