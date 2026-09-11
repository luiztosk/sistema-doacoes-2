import { Hono } from "hono";
import { drizzle } from 'drizzle-orm/d1';
import { D1Database } from '@cloudflare/workers-types';

import { customers } from './db/schema';

const app = new Hono<{ Bindings: Env }>();

type Env = { prod_sistema_doacoes_2: D1Database; }

app.get("/api/", async (c) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2)
    const result = await db.select().from(customers).all()
    return c.json(result)
})

export default app;
