import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi'
import { eq, sql, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Context } from 'hono';
import { delivery, deliveryLine } from '../../../schemas/db/inventory';
import { 
  deliverySelectSchema, 
  deliveryUpdateSchema,
  deliveryLineInsertSchema,
  DeliverySelect 
} from '../../../schemas/zod/inventory';
import { z } from 'zod';

const deliveryLinePayloadSchema = deliveryLineInsertSchema.omit({ deliveryId: true });

const deliveryWithLinesSchema = deliverySelectSchema.extend({
  lines: z.array(deliveryLinePayloadSchema).min(1, { error: 'A delivery needs at least one line.' }),
});

const getDeliveriesRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/api/v1/deliveries',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: deliverySelectSchema.array(),
          },
        },
      },
    },
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const data = await db.select().from(delivery).all() as DeliverySelect[];
    return c.json(data, 200);
  }
});

const getDeliveryRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/api/v1/deliveries/{id}',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: deliveryWithLinesSchema,
          },
        },
      },
      404: {
        description: 'Delivery not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [del] = await db.select().from(delivery).where(eq(delivery.id, id)).limit(1);
    
    if (!del) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Delivery not found.' } }, 404);
    }
    
    const lines = await db
      .select({
        itemId: deliveryLine.itemId,
        quantity: deliveryLine.quantity,
      })
      .from(deliveryLine)
      .where(eq(deliveryLine.deliveryId, id));
    
    return c.json({ ...del, lines }, 200);
  }
});

const createDeliveryRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/api/v1/deliveries',
    request: {
      body: {
        content: {
          'application/json': {
            schema: deliveryWithLinesSchema,
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          'application/json': {
            schema: deliveryWithLinesSchema,
          },
        },
      },
      400: {
        description: 'Invalid input',
      },
      409: {
        description: 'Insufficient stock',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const payload = await c.req.json() as { lines: z.infer<typeof deliveryLinePayloadSchema>[]; beneficiaryId: string; occurredAt: string | Date; note?: string | null };
    const { lines, ...deliveryData } = payload;
    const occurredAt = typeof deliveryData.occurredAt === 'string' ? new Date(deliveryData.occurredAt) : deliveryData.occurredAt;
    
    // Check for duplicate items
    const itemIds = lines.map((line) => line.itemId);
    if (new Set(itemIds).size !== itemIds.length) {
      return c.json({ error: { code: 'INVALID_VALUE', message: 'An item cannot appear twice in the same delivery.' } }, 400);
    }
    
    // Check stock availability
    const stock = await db
      .select({
        id: item.id,
        onHand: item.onHand,
        reservedQuantity: item.reservedQuantity,
      })
      .from(item)
      .where(inArray(item.id, itemIds));
    
    const stockMap = new Map(stock.map(row => [row.id, row]));
    
    for (const line of lines) {
      const item = stockMap.get(line.itemId);
      if (!item) {
        return c.json({ error: { code: 'INVALID_REFERENCE', message: 'One of the references sent does not exist.' } }, 400);
      }
      const available = item.onHand - item.reservedQuantity;
      if (available < line.quantity) {
        return c.json({ error: { code: 'INSUFFICIENT_STOCK', message: 'One of the items does not have enough stock available.' } }, 409);
      }
    }
    
    const id = crypto.randomUUID();
    
    const lineInserts = lines.map((line) =>
      db
        .insert(deliveryLine)
        .values({
          deliveryId: id,
          itemId: line.itemId,
          quantity: line.quantity,
        })
    );
    
    const reserveUpdates = lines.map((line) =>
      db
        .update(item)
        .set({ reservedQuantity: sql`${item.reservedQuantity} + ${line.quantity}` })
        .where(eq(item.id, line.itemId))
    );
    
    await db.batch([
      db
        .insert(delivery)
        .values({
          id,
          ...deliveryData,
          occurredAt,
        }),
      ...lineInserts,
      ...reserveUpdates,
    ]);
    
    const [data] = await db.select().from(delivery).where(eq(delivery.id, id)).limit(1);
    const createdLines = await db
      .select({
        itemId: deliveryLine.itemId,
        quantity: deliveryLine.quantity,
      })
      .from(deliveryLine)
      .where(eq(deliveryLine.deliveryId, id));
    
    c.header('Location', `${c.req.path}/${id}`);
    return c.json({ ...data, lines: createdLines }, 201);
  }
});

const completeDeliveryRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/api/v1/deliveries/{id}/complete',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: deliveryWithLinesSchema,
          },
        },
      },
      400: {
        description: 'Invalid transition',
      },
      404: {
        description: 'Delivery not found',
      },
      409: {
        description: 'Conflict - reserved stock no longer covers this operation',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [existing] = await db.select().from(delivery).where(eq(delivery.id, id)).limit(1);
    
    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Delivery not found.' } }, 404);
    }
    
    if (existing.status !== 'OPEN') {
      return c.json({ error: { code: 'INVALID_TRANSITION', message: `Cannot complete a delivery in status ${existing.status}.` } }, 400);
    }
    
    const lines = await db
      .select({
        itemId: deliveryLine.itemId,
        quantity: deliveryLine.quantity,
      })
      .from(deliveryLine)
      .where(eq(deliveryLine.deliveryId, id));
    
    // Check reserved quantities
    const itemIds = lines.map(l => l.itemId);
    const reserved = await db
      .select({
        id: item.id,
        reservedQuantity: item.reservedQuantity,
      })
      .from(item)
      .where(inArray(item.id, itemIds));
    
    const reservedMap = new Map(reserved.map(row => [row.id, row.reservedQuantity]));
    
    for (const line of lines) {
      if ((reservedMap.get(line.itemId) ?? 0) < line.quantity) {
        return c.json({ error: { code: 'CONFLICT', message: 'The reserved stock no longer covers this operation.' } }, 409);
      }
    }
    
    const consumeUpdates = lines.map((line) =>
      db
        .update(item)
        .set({ 
          onHand: sql`${item.onHand} - ${line.quantity}`,
          reservedQuantity: sql`${item.reservedQuantity} - ${line.quantity}`,
        })
        .where(eq(item.id, line.itemId))
    );
    
    const batchOps = [
      ...consumeUpdates,
      db
        .update(delivery)
        .set({ status: 'COMPLETED' })
        .where(eq(delivery.id, id)),
    ];
    
    // @ts-expect-error - BatchItem tuple type inference issue with spread arrays
    await db.batch(batchOps);
    
    const [data] = await db.select().from(delivery).where(eq(delivery.id, id)).limit(1);
    const updatedLines = await db
      .select({
        itemId: deliveryLine.itemId,
        quantity: deliveryLine.quantity,
      })
      .from(deliveryLine)
      .where(eq(deliveryLine.deliveryId, id));
    
    return c.json({ ...data, lines: updatedLines }, 200);
  }
});

const cancelDeliveryRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/api/v1/deliveries/{id}/cancel',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: deliveryWithLinesSchema,
          },
        },
      },
      400: {
        description: 'Invalid transition',
      },
      404: {
        description: 'Delivery not found',
      },
      409: {
        description: 'Conflict - reserved stock no longer covers this operation',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [existing] = await db.select().from(delivery).where(eq(delivery.id, id)).limit(1);
    
    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Delivery not found.' } }, 404);
    }
    
    if (existing.status !== 'OPEN') {
      return c.json({ error: { code: 'INVALID_TRANSITION', message: `Cannot cancel a delivery in status ${existing.status}.` } }, 400);
    }
    
    const lines = await db
      .select({
        itemId: deliveryLine.itemId,
        quantity: deliveryLine.quantity,
      })
      .from(deliveryLine)
      .where(eq(deliveryLine.deliveryId, id));
    
    // Check reserved quantities
    const itemIds = lines.map(l => l.itemId);
    const reserved = await db
      .select({
        id: item.id,
        reservedQuantity: item.reservedQuantity,
      })
      .from(item)
      .where(inArray(item.id, itemIds));
    
    const reservedMap = new Map(reserved.map(row => [row.id, row.reservedQuantity]));
    
    for (const line of lines) {
      if ((reservedMap.get(line.itemId) ?? 0) < line.quantity) {
        return c.json({ error: { code: 'CONFLICT', message: 'The reserved stock no longer covers this operation.' } }, 409);
      }
    }
    
    const releaseUpdates = lines.map((line) =>
      db
        .update(item)
        .set({ reservedQuantity: sql`${item.reservedQuantity} - ${line.quantity}` })
        .where(eq(item.id, line.itemId))
    );
    
    const batchOps = [
      ...releaseUpdates,
      db
        .update(delivery)
        .set({ status: 'CANCELLED' })
        .where(eq(delivery.id, id)),
    ];
    
    // @ts-expect-error - BatchItem tuple type inference issue with spread arrays
    await db.batch(batchOps);
    
    const [data] = await db.select().from(delivery).where(eq(delivery.id, id)).limit(1);
    const updatedLines = await db
      .select({
        itemId: deliveryLine.itemId,
        quantity: deliveryLine.quantity,
      })
      .from(deliveryLine)
      .where(eq(deliveryLine.deliveryId, id));
    
    return c.json({ ...data, lines: updatedLines }, 200);
  }
});

const updateDeliveryRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/api/v1/deliveries/{id}',
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: {
          'application/json': {
            schema: deliveryUpdateSchema,
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: deliverySelectSchema,
          },
        },
      },
      400: {
        description: 'Invalid input',
      },
      404: {
        description: 'Delivery not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [existing] = await db.select().from(delivery).where(eq(delivery.id, id)).limit(1);
    
    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Delivery not found.' } }, 404);
    }
    
    const payload = await c.req.json();
    
    const [data] = await db
      .update(delivery)
      .set(payload)
      .where(eq(delivery.id, id))
      .returning();

    return c.json(data, 200);
  }
});

const deleteDeliveryRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete',
    path: '/api/v1/deliveries/{id}',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      204: {
        description: 'Delivery deleted successfully',
      },
      404: {
        description: 'Delivery not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [removed] = await db
      .delete(delivery)
      .where(eq(delivery.id, id))
      .returning({ id: delivery.id });

    if (!removed) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Delivery not found.' } }, 404);
    }

    return c.body(null, 204);
  }
});

export const deliveryRoutes = [
  getDeliveriesRoute,
  getDeliveryRoute,
  createDeliveryRoute,
  completeDeliveryRoute,
  cancelDeliveryRoute,
  updateDeliveryRoute,
  deleteDeliveryRoute
]