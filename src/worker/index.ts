import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { D1Database } from '@cloudflare/workers-types';
// import { createAuthHandler } from "./auth";
import { auth } from "./auth";

import { assistido } from './db/schema';
import { sessionMiddleware } from "./session-middleware";

const app = new Hono<{ Bindings: Env }>();

export type Env = {
  prod_sistema_doacoes_2: D1Database;
};

app.use("/api/assistidos/*", sessionMiddleware, async (c, next) => {
    const session = c.get("session");
    if (!session) {
        throw new HTTPException(401);
    }
    await next();
});

app.get("/api/assistidos", async (c) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const assistidos = await db.select().from(assistido).all();
    return c.json({ assistidos });
});

app.get('/api/assistidos/:id', async (c) => {
    const id = c.req.param('id')
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const result = await db.select().from(assistido).where(eq(assistido.id, id))
    return c.json({ assistidos: result });
})

app.all("/api/auth/*", async (c) => {
    // const handler = createAuthHandler(c.env);
    // return handler(c.req.raw);
    return auth.handler(c.req.raw);
});

export default app;
