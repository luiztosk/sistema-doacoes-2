import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm';
import {
  InventoryItemTableView,
  inventoryItemTableViewSchema,
  inventoryItemSelectSchema,
} from "../../../schemas/zod/inventory";
import { drizzle } from 'drizzle-orm/d1';
import { Context } from 'hono';
import { inventoryItem } from '../../../schemas/db/inventory';
import { z } from 'zod';

const getInventoryItemsTableRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/api/v1/inventory/items',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: inventoryItemTableViewSchema.array(),
          },
        },
      },
    },
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const data = await db.select().from(inventoryItem).all() as InventoryItemTableView[];
    return c.json(
      data,
      200
    );
  }
})

const getInventoryItemRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/api/v1/inventory/items/{id}',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: inventoryItemSelectSchema,
          },
        },
      },
      404: {
        description: 'Inventory item not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    // Get the inventory item
    const [item] = await db.select().from(inventoryItem).where(eq(inventoryItem.id, id)).limit(1);
    
    if (!item) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Inventory item not found.' } }, 404);
    }
    
    return c.json(item, 200);
  }
});

const createInventoryItemRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/api/v1/inventory/items',
    responses: {
      201: {
        content: {
          'application/json': {
            schema: inventoryItemSelectSchema,
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
      .insert(inventoryItem)
      .values({
        id: crypto.randomUUID(),
        ...payload,
      })
      .returning();

    c.header('Location', `${c.req.path}/${data.id}`);
    return c.json(data, 201);
  }
});

const updateInventoryItemRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/api/v1/inventory/items/{id}',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: inventoryItemSelectSchema,
          },
        },
      },
      400: {
        description: 'Invalid input',
      },
      404: {
        description: 'Inventory item not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    // Check if item exists
    const [existing] = await db.select().from(inventoryItem).where(eq(inventoryItem.id, id)).limit(1);
    
    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Inventory item not found.' } }, 404);
    }
    
    const payload = await c.req.json();
    
    const [data] = await db
      .update(inventoryItem)
      .set(payload)
      .where(eq(inventoryItem.id, id))
      .returning();

    return c.json(data, 200);
  }
});

const deleteInventoryItemRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete',
    path: '/api/v1/inventory/items/{id}',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      204: {
        description: 'Inventory item deleted successfully',
      },
      404: {
        description: 'Inventory item not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [removed] = await db
      .delete(inventoryItem)
      .where(eq(inventoryItem.id, id))
      .returning({ id: inventoryItem.id });

    if (!removed) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Inventory item not found.' } }, 404);
    }

    return c.body(null, 204);
  }
});

export const inventoryItemRoutes = [
  getInventoryItemsTableRoute, 
  getInventoryItemRoute, 
  createInventoryItemRoute, 
  updateInventoryItemRoute, 
  deleteInventoryItemRoute
]