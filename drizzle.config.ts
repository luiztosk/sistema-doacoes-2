import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schemas/db/schemas.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
});
