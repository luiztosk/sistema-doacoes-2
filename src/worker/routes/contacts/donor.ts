import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Context } from 'hono';
import { donor } from '../../../schemas/db/contacts';
import { donorSelectSchema, donorInsertSchema, donorUpdateSchema, DonorSelect } from '../../../schemas/zod/contacts';
import { z } from 'zod';

const getDonorsRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/api/v1/donors',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: donorSelectSchema.array(),
          },
        },
      },
    },
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const data = await db.select().from(donor).all() as DonorSelect[];
    return c.json(data, 200);
  }
});

const getDonorRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/api/v1/donors/{id}',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: donorSelectSchema,
          },
        },
      },
      404: {
        description: 'Donor not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [don] = await db.select().from(donor).where(eq(donor.id, id)).limit(1);
    
    if (!don) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Donor not found.' } }, 404);
    }
    
    return c.json(don, 200);
  }
});

const createDonorRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/api/v1/donors',
    request: {
      body: {
        content: {
          'application/json': {
            schema: donorInsertSchema,
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          'application/json': {
            schema: donorSelectSchema,
          },
        },
      },
      400: {
        description: 'Invalid input',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const payload = await c.req.json();
    
    const [data] = await db
      .insert(donor)
      .values({
        id: crypto.randomUUID(),
        ...payload,
      })
      .returning();

    c.header('Location', `${c.req.path}/${data.id}`);
    return c.json(data, 201);
  }
});

const updateDonorRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/api/v1/donors/{id}',
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: {
          'application/json': {
            schema: donorUpdateSchema,
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: donorSelectSchema,
          },
        },
      },
      400: {
        description: 'Invalid input',
      },
      404: {
        description: 'Donor not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [existing] = await db.select().from(donor).where(eq(donor.id, id)).limit(1);
    
    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Donor not found.' } }, 404);
    }
    
    const payload = await c.req.json();
    
    const [data] = await db
      .update(donor)
      .set(payload)
      .where(eq(donor.id, id))
      .returning();

    return c.json(data, 200);
  }
});

const deleteDonorRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete',
    path: '/api/v1/donors/{id}',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      204: {
        description: 'Donor deleted successfully',
      },
      404: {
        description: 'Donor not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [removed] = await db
      .delete(donor)
      .where(eq(donor.id, id))
      .returning({ id: donor.id });

    if (!removed) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Donor not found.' } }, 404);
    }

    return c.body(null, 204);
  }
});

export const donorRoutes = [
  getDonorsRoute,
  getDonorRoute,
  createDonorRoute,
  updateDonorRoute,
  deleteDonorRoute
]