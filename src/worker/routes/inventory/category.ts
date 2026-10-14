import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Context } from 'hono';
import { itemCategory } from '../../../schemas/db/inventory';
import { itemCategorySelectSchema, itemCategoryInsertSchema, itemCategoryUpdateSchema, ItemCategorySelect } from "../../../schemas/zod/inventory";
import { z } from 'zod';

const getInventoryCategoriesRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/api/v1/inventory/categories',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: itemCategorySelectSchema.array(),
          },
        },
      },
    },
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const data = await db.select().from(itemCategory).all() as ItemCategorySelect[];
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
            schema: itemCategoryInsertSchema,
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          'application/json': {
            schema: itemCategorySelectSchema,
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
      .insert(itemCategory)
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
            schema: itemCategorySelectSchema,
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
    
    const [category] = await db.select().from(itemCategory).where(eq(itemCategory.id, id)).limit(1);
    
    if (!category) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Category not found.' } }, 404);
    }
    
    return c.json(category, 200);
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
            schema: itemCategoryUpdateSchema,
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: itemCategorySelectSchema,
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
    
    const [existing] = await db.select().from(itemCategory).where(eq(itemCategory.id, id)).limit(1);
    
    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Category not found.' } }, 404);
    }
    
    const payload = await c.req.json();
    
    const [data] = await db
      .update(itemCategory)
      .set(payload)
      .where(eq(itemCategory.id, id))
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
      .delete(itemCategory)
      .where(eq(itemCategory.id, id))
      .returning({ id: itemCategory.id });

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