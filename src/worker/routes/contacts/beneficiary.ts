import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Context } from 'hono';
import { beneficiary } from '../../../schemas/db/contacts';
import { beneficiarySelectSchema, beneficiaryInsertSchema, beneficiaryUpdateSchema, BeneficiarySelect } from '../../../schemas/zod/contacts';
import { z } from 'zod';

const getBeneficiariesRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/api/v1/beneficiaries',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: beneficiarySelectSchema.array(),
          },
        },
      },
    },
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const data = await db.select().from(beneficiary).all() as BeneficiarySelect[];
    return c.json(data, 200);
  }
});

const getBeneficiaryRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/api/v1/beneficiaries/{id}',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: beneficiarySelectSchema,
          },
        },
      },
      404: {
        description: 'Beneficiary not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [benef] = await db.select().from(beneficiary).where(eq(beneficiary.id, id)).limit(1);
    
    if (!benef) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Beneficiary not found.' } }, 404);
    }
    
    return c.json(benef, 200);
  }
});

const createBeneficiaryRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/api/v1/beneficiaries',
    request: {
      body: {
        content: {
          'application/json': {
            schema: beneficiaryInsertSchema,
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          'application/json': {
            schema: beneficiarySelectSchema,
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
      .insert(beneficiary)
      .values({
        id: crypto.randomUUID(),
        ...payload,
      })
      .returning();

    c.header('Location', `${c.req.path}/${data.id}`);
    return c.json(data, 201);
  }
});

const updateBeneficiaryRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/api/v1/beneficiaries/{id}',
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: {
          'application/json': {
            schema: beneficiaryUpdateSchema,
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: beneficiarySelectSchema,
          },
        },
      },
      400: {
        description: 'Invalid input',
      },
      404: {
        description: 'Beneficiary not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [existing] = await db.select().from(beneficiary).where(eq(beneficiary.id, id)).limit(1);
    
    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Beneficiary not found.' } }, 404);
    }
    
    const payload = await c.req.json();
    
    const [data] = await db
      .update(beneficiary)
      .set(payload)
      .where(eq(beneficiary.id, id))
      .returning();

    return c.json(data, 200);
  }
});

const deleteBeneficiaryRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete',
    path: '/api/v1/beneficiaries/{id}',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      204: {
        description: 'Beneficiary deleted successfully',
      },
      404: {
        description: 'Beneficiary not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [removed] = await db
      .delete(beneficiary)
      .where(eq(beneficiary.id, id))
      .returning({ id: beneficiary.id });

    if (!removed) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Beneficiary not found.' } }, 404);
    }

    return c.body(null, 204);
  }
});

export const beneficiaryRoutes = [
  getBeneficiariesRoute,
  getBeneficiaryRoute,
  createBeneficiaryRoute,
  updateBeneficiaryRoute,
  deleteBeneficiaryRoute
]