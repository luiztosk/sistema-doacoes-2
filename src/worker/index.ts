import { Hono } from "hono";
import { drizzle } from 'drizzle-orm/d1';
import { D1Database } from '@cloudflare/workers-types';
import { createAuthHandler } from "./auth";

import { assistido } from './db/schema';

const app = new Hono<{ Bindings: Env }>();

export type Env = {
  prod_sistema_doacoes_2: D1Database;
};

app.get("/api/", async (c) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const assistidos = await db.select().from(assistido).all();
    return c.json({ assistidos });
});

app.all("/api/auth/*", async (c) => {
    const handler = createAuthHandler(c.env);
    return handler(c.req.raw);
});

export default app;
