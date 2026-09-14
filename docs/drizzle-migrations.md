Here is the complete documentation formatted in Markdown. You can copy the code block below and save it as `drizzle-d1-team-workflow.md`.

```markdown
# Reconciling Drizzle ORM and Cloudflare D1 for Team Development

This document outlines the workflow for managing a Cloudflare D1 database using Drizzle ORM in a team environment where only one person (the Admin) has access to the remote production database, while the rest of the team works exclusively with local databases.

> **Reference:** We use the [`drizzle-adapter` from `better-auth`](https://better-auth.com/docs/adapters/drizzle) for authentication tables (`auth-schema`). The adapter manages its own schema references, so the seed/migration workflow below applies to the application tables (`assistido`, `doador`, etc.).

## 1. Configuration

To ensure Wrangler can automatically find and apply migrations, configure Drizzle to output to the `migrations` folder. 

Update your `drizzle.config.ts`:

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/worker/db/schema.ts',
  // IMPORTANT: Output to 'migrations' so Wrangler can find them automatically
  out: './drizzle/migrations', 
  dialect: 'sqlite', // D1 is SQLite under the hood
  
  // Note: Omit dbCredentials for local D1. 
  // We use the Wrangler CLI to apply migrations, not drizzle-kit push/migrate.
});
```

## 2. The Workflow

### 👨‍💻 Admin Workflow (Remote Access)
When you make a change to the database schema:

1. **Update your schema** in `src/worker/db/schema.ts`.
2. **Generate the migration**:
   ```bash
   npx drizzle-kit generate
   ```
   *(This creates a `.sql` file inside the `\./drizzle/migrations/` folder).*
3. **Commit to Git**: Commit both the updated `schema.ts` and the new SQL file in `\./drizzle/migrations/`.
4. **Apply to Remote D1**:
   ```bash
   npx wrangler d1 execute YOUR_DB_NAME --remote --file=\./drizzle/migrations/0000_xxxxx.sql
   ```

### 👥 Team Workflow (Local Only)
When colleagues pull your changes from Git, they need to update their local D1 database.

1. **Pull the latest code** (which includes the new `migrations/*.sql` files).
2. **Apply migrations to their local D1**:
   ```bash
   # This applies all unapplied migrations in the \./drizzle/migrations folder to their local DB
   npx wrangler d1 migrations apply YOUR_DB_NAME --local
   ```

## 3. Reconciling the Data

Since colleagues cannot pull data from the remote D1, they will have empty tables. Use one of the following methods to provide baseline data.

### Approach A: Drizzle Seed Script (Recommended)
Create a `src/worker/db/seed.ts` file that uses Drizzle to insert baseline development data (e.g., default roles, test users).

```typescript
// src/worker/db/seed.ts
import { drizzle } from 'drizzle-orm/d1';
import { users, roles } from './schema';
import { getPlatformProxy } from 'wrangler';

async function seed() {
  // Get local D1 binding
  const { env } = await getPlatformProxy(); 
  const db = drizzle(env.DB);

  console.log("Seeding local database...");
  
  await db.insert(roles).values([
    { id: 1, name: 'admin' },
    { id: 2, name: 'user' }
  ]);

  await db.insert(users).values([
    { id: 1, name: 'Test User', roleId: 2 }
  ]);

  console.log("Seeding complete!");
}

seed().catch(console.error);
```

### Approach B: Sanitized SQL Dump (For large datasets)
If you need the team to have a lot of data:
1. **Admin** exports the remote DB: `npx wrangler d1 export YOUR_DB_NAME --remote --output=dump.sql`
2. **Admin** opens `dump.sql`, deletes/obfuscates sensitive data, and saves it to `seeds/baseline.sql`.
3. **Admin** commits `seeds/baseline.sql` to Git.
4. **Team** imports it locally: `npx wrangler d1 execute YOUR_DB_NAME --local --file=./seeds/baseline.sql`

## 4. Package.json Scripts

Add these helper scripts to your root `package.json` to make the workflow foolproof for the team:

```json
"scripts": {
  "dev": "wrangler dev",
  
  "--- Admin Commands ---": "",
  "db:generate": "drizzle-kit generate",
  "db:push:remote": "wrangler d1 execute YOUR_DB_NAME --remote --file",
  
  "--- Team Commands ---": "",
  "db:migrate:local": "wrangler d1 migrations apply YOUR_DB_NAME --local",
  "db:seed": "npx tsx src/worker/db/seed.ts",
  
  "--- The 'I just pulled from Git' command ---": "",
  "db:update:local": "npm run db:migrate:local && npm run db:seed"
}
```

## 5. Golden Rules for the Team

1. **Never use `drizzle-kit push`**. It bypasses the migration files and will break the sync between local and remote. Always use `generate`.
2. **Never share `wrangler.toml` secrets** or remote D1 UUIDs with the team. They only need the database *name* defined in `wrangler.toml`.
3. **Always run `npm run db:update:local`** after pulling from Git to ensure their local SQLite file matches the remote schema and has the necessary seed data.
4. **Ignore the Wrangler state folder**. Ensure `.wrangler/` is in your `.gitignore` so local database files are never accidentally committed.

```gitignore
# .gitignore
.wrangler/
node_modules/
```
```