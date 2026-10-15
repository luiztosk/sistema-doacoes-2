import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi'
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Context } from 'hono';
import { inventoryAdjustment } from '../../../schemas/db/inventory';
import { 
  inventoryAdjustmentSelectSchema, 
  inventoryAdjustmentInsertSchema, 
  inventoryAdjustmentUpdateSchema,
  InventoryAdjustmentSelect 
} from '../../../schemas/zod/inventory';
import { z } from 'zod';

const REASONS_ADJUSTMENT = ["STOCKTAKE", "DONOR_RETURN", "LOSS", "DAMAGE", "CORRECTION"] as const;

const adjustmentCreateSchema = inventoryAdjustmentInsertSchema
  .omit({ countId: true })
  .extend({ reason: z.enum(REASONS_ADJUSTMENT) });

const getInventoryAdjustmentsRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/api/v1/inventory-adjustments',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: inventoryAdjustmentSelectSchema.array(),
          },
        },
      },
    },
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const data = await db.select().from(inventoryAdjustment).all() as InventoryAdjustmentSelect[];
    return c.json(data, 200);
  }
});

const getInventoryAdjustmentRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/api/v1/inventory-adjustments/{id}',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: inventoryAdjustmentSelectSchema,
          },
        },
      },
      404: {
        description: 'Inventory adjustment not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [adj] = await db.select().from(inventoryAdjustment).where(eq(inventoryAdjustment.id, id)).limit(1);
    
    if (!adj) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Inventory adjustment not found.' } }, 404);
    }
    
    return c.json(adj, 200);
  }
});

const createInventoryAdjustmentRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/api/v1/inventory-adjustments',
    request: {
      body: {
        content: {
          'application/json': {
            schema: adjustmentCreateSchema,
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          'application/json': {
            schema: inventoryAdjustmentSelectSchema,
          },
        },
      },
      400: {
        description: 'Invalid input',
      },
      409: {
        description: 'Adjustment would leave stock below zero',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const payload = await c.req.json();
    
    const id = crypto.randomUUID();
    
    const results = await db.batch([
      db
        .insert(inventoryAdjustment)
        .values({
          id,
          ...payload,
        }),
      db
        .update(item)
        .set({ onHand: sql`${item.onHand} + ${payload.delta}` })
        .where(eq(item.id, payload.itemId)),
    ]);
    
    if (results[1].meta.changes === 0) {
      await db
        .delete(inventoryAdjustment)
        .where(eq(inventoryAdjustment.id, id))
        .run();
      return c.json({ error: { code: 'CONFLICT', message: 'The adjustment would leave the stock below zero.' } }, 409);
    }
    
    const [data] = await db.select().from(inventoryAdjustment).where(eq(inventoryAdjustment.id, id)).limit(1);
    
    c.header('Location', `${c.req.path}/${id}`);
    return c.json(data, 201);
  }
});

const updateInventoryAdjustmentRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/api/v1/inventory-adjustments/{id}',
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: {
          'application/json': {
            schema: inventoryAdjustmentUpdateSchema,
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: inventoryAdjustmentSelectSchema,
          },
        },
      },
      400: {
        description: 'Invalid input',
      },
      404: {
        description: 'Inventory adjustment not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [existing] = await db.select().from(inventoryAdjustment).where(eq(inventoryAdjustment.id, id)).limit(1);
    
    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Inventory adjustment not found.' } }, 404);
    }
    
    const payload = await c.req.json();
    
    const [data] = await db
      .update(inventoryAdjustment)
      .set(payload)
      .where(eq(inventoryAdjustment.id, id))
      .returning();

    return c.json(data, 200);
  }
});

const deleteInventoryAdjustmentRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete',
    path: '/api/v1/inventory-adjustments/{id}',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      204: {
        description: 'Inventory adjustment deleted successfully',
      },
      404: {
        description: 'Inventory adjustment not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [removed] = await db
      .delete(inventoryAdjustment)
      .where(eq(inventoryAdjustment.id, id))
      .returning({ id: inventoryAdjustment.id });

    if (!removed) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Inventory adjustment not found.' } }, 404);
    }

    return c.body(null, 204);
  }
});

export const inventoryAdjustmentRoutes = [
  getInventoryAdjustmentsRoute,
  getInventoryAdjustmentRoute,
  createInventoryAdjustmentRoute,
  updateInventoryAdjustmentRoute,
  deleteInventoryAdjustmentRoute
]