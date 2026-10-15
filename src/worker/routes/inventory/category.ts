import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Context } from 'hono';
import { category } from '../../../schemas/db/inventory';
import { categorySelectSchema, categoryInsertSchema, categoryUpdateSchema, CategorySelect } from "../../../schemas/zod/inventory";
import { z } from 'zod';

const getInventoryCategoriesRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/api/v1/inventory/categories',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: categorySelectSchema.array(),
          },
        },
      },
    },
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const data = await db.select().from(category).all() as CategorySelect[];
    return c.json(
      data,
      200
    );
  }
});

const createInventoryCategoryRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/api/v1/inventory/categories',
    request: {
      body: {
        content: {
          'application/json': {
            schema: categoryInsertSchema,
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          'application/json': {
            schema: categorySelectSchema,
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
      .insert(category)
      .values({
        id: crypto.randomUUID(),
        ...payload,
      })
      .returning();

    c.header('Location', `${c.req.path}/${data.id}`);
    return c.json(data, 201);
  }
});

const getInventoryCategoryRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/api/v1/inventory/categories/{id}',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: categorySelectSchema,
          },
        },
      },
      404: {
        description: 'Category not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [cat] = await db.select().from(category).where(eq(category.id, id)).limit(1);
    
    if (!cat) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Category not found.' } }, 404);
    }
    
    return c.json(cat, 200);
  }
});

const updateInventoryCategoryRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/api/v1/inventory/categories/{id}',
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: {
          'application/json': {
            schema: categoryUpdateSchema,
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: categorySelectSchema,
          },
        },
      },
      400: {
        description: 'Invalid input',
      },
      404: {
        description: 'Category not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [existing] = await db.select().from(category).where(eq(category.id, id)).limit(1);
    
    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Category not found.' } }, 404);
    }
    
    const payload = await c.req.json();
    
    const [data] = await db
      .update(category)
      .set(payload)
      .where(eq(category.id, id))
      .returning();

    return c.json(data, 200);
  }
});

const deleteInventoryCategoryRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete',
    path: '/api/v1/inventory/categories/{id}',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      204: {
        description: 'Category deleted successfully',
      },
      404: {
        description: 'Category not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [removed] = await db
      .delete(category)
      .where(eq(category.id, id))
      .returning({ id: category.id });

    if (!removed) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Category not found.' } }, 404);
    }

    return c.body(null, 204);
  }
});

export const inventoryCategoryRoutes = [
  getInventoryCategoriesRoute,
  getInventoryCategoryRoute,
  createInventoryCategoryRoute,
  updateInventoryCategoryRoute,
  deleteInventoryCategoryRoute
]