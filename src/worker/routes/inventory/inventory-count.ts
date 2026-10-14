import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi'
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Context } from 'hono';
import { inventoryCount, inventoryCountLine, inventoryItem, inventoryAdjustment } from '../../../schemas/db/inventory';
import { 
  inventoryCountSelectSchema, 
  inventoryCountUpdateSchema,
  inventoryCountLineInsertSchema,
  InventoryCountSelect 
} from '../../../schemas/zod/inventory';
import { z } from 'zod';

const inventoryCountLinePayloadSchema = inventoryCountLineInsertSchema.omit({ countId: true });

const inventoryCountWithLinesSchema = inventoryCountSelectSchema.extend({
  lines: z.array(inventoryCountLinePayloadSchema).min(1, { error: 'A count needs at least one line.' }),
});

const getInventoryCountsRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/api/v1/inventory-counts',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: inventoryCountSelectSchema.array(),
          },
        },
      },
    },
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const data = await db.select().from(inventoryCount).all() as InventoryCountSelect[];
    return c.json(data, 200);
  }
});

const getInventoryCountRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/api/v1/inventory-counts/{id}',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: inventoryCountWithLinesSchema,
          },
        },
      },
      404: {
        description: 'Inventory count not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [count] = await db.select().from(inventoryCount).where(eq(inventoryCount.id, id)).limit(1);
    
    if (!count) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Inventory count not found.' } }, 404);
    }
    
    const lines = await db
      .select({
        inventoryItemId: inventoryCountLine.inventoryItemId,
        countedQuantity: inventoryCountLine.countedQuantity,
      })
      .from(inventoryCountLine)
      .where(eq(inventoryCountLine.countId, id));
    
    return c.json({ ...count, lines }, 200);
  }
});

const createInventoryCountRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/api/v1/inventory-counts',
    request: {
      body: {
        content: {
          'application/json': {
            schema: inventoryCountWithLinesSchema,
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          'application/json': {
            schema: inventoryCountWithLinesSchema,
          },
        },
      },
      400: {
        description: 'Invalid input',
      },
      409: {
        description: 'Counted quantity below reserved',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const payload = await c.req.json() as { lines: z.infer<typeof inventoryCountLinePayloadSchema>[]; occurredAt: string | Date; countedBy?: string | null; note?: string | null };
    const { lines, ...countData } = payload;
    const occurredAt = typeof countData.occurredAt === 'string' ? new Date(countData.occurredAt) : countData.occurredAt;
    
    // Check for duplicate items
    const itemIds = lines.map((line) => line.inventoryItemId);
    if (new Set(itemIds).size !== itemIds.length) {
      return c.json({ error: { code: 'INVALID_VALUE', message: 'An item cannot appear twice in the same count.' } }, 400);
    }
    
    // Get current stock
    const stock = await db
      .select({
        id: inventoryItem.id,
        onHand: inventoryItem.onHand,
        reservedQuantity: inventoryItem.reservedQuantity,
      })
      .from(inventoryItem)
      .where(inArray(inventoryItem.id, itemIds));
    
    const stockMap = new Map(stock.map(row => [row.id, row]));
    
    for (const line of lines) {
      const item = stockMap.get(line.inventoryItemId);
      if (!item) {
        return c.json({ error: { code: 'INVALID_REFERENCE', message: 'One of the references sent does not exist.' } }, 400);
      }
      if (line.countedQuantity < item.reservedQuantity) {
        return c.json({ error: { code: 'INSUFFICIENT_STOCK', message: 'Counted quantity cannot be below reserved quantity.' } }, 409);
      }
    }
    
    const id = crypto.randomUUID();
    
    const countLineInserts = lines.map((line) =>
      db
        .insert(inventoryCountLine)
        .values({
          countId: id,
          inventoryItemId: line.inventoryItemId,
          countedQuantity: line.countedQuantity,
        })
    );
    
    const adjustmentInserts = lines.map((line) => {
      const item = stockMap.get(line.inventoryItemId)!;
      const delta = line.countedQuantity - item.onHand;
      return db
        .insert(inventoryAdjustment)
        .values({
          id: crypto.randomUUID(),
          inventoryItemId: line.inventoryItemId,
          delta,
          reason: 'STOCKTAKE',
          occurredAt,
          countId: id,
        });
    });
    
    const onHandUpdates = lines.map((line) =>
      db
        .update(inventoryItem)
        .set({ onHand: line.countedQuantity })
        .where(eq(inventoryItem.id, line.inventoryItemId))
    );
    
    await db.batch([
      db
        .insert(inventoryCount)
        .values({
          id,
          ...countData,
          occurredAt,
        }),
      ...countLineInserts,
      ...adjustmentInserts,
      ...onHandUpdates,
    ]);
    
    const [data] = await db.select().from(inventoryCount).where(eq(inventoryCount.id, id)).limit(1);
    const createdLines = await db
      .select({
        inventoryItemId: inventoryCountLine.inventoryItemId,
        countedQuantity: inventoryCountLine.countedQuantity,
      })
      .from(inventoryCountLine)
      .where(eq(inventoryCountLine.countId, id));
    
    c.header('Location', `${c.req.path}/${id}`);
    return c.json({ ...data, lines: createdLines }, 201);
  }
});

const updateInventoryCountRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/api/v1/inventory-counts/{id}',
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: {
          'application/json': {
            schema: inventoryCountUpdateSchema,
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: inventoryCountSelectSchema,
          },
        },
      },
      400: {
        description: 'Invalid input',
      },
      404: {
        description: 'Inventory count not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [existing] = await db.select().from(inventoryCount).where(eq(inventoryCount.id, id)).limit(1);
    
    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Inventory count not found.' } }, 404);
    }
    
    const payload = await c.req.json();
    
    const [data] = await db
      .update(inventoryCount)
      .set(payload)
      .where(eq(inventoryCount.id, id))
      .returning();

    return c.json(data, 200);
  }
});

export const inventoryCountRoutes = [
  getInventoryCountsRoute,
  getInventoryCountRoute,
  createInventoryCountRoute,
  updateInventoryCountRoute
]