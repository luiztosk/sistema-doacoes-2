import { integer, text, sqliteTable } from 'drizzle-orm/sqlite-core'
// manage your schema
export const customers = sqliteTable('Customers', {
  CustomerId: integer().primaryKey({ autoIncrement: true }),
  CompanyName: text(),
  ContactName: text(),
});