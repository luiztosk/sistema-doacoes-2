import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi'
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Context } from 'hono';
import { donation, donationLine } from '../../../schemas/db/inventory';
import { 
  donationSelectSchema, 
  donationUpdateSchema,
  donationLineInsertSchema,
  DonationSelect 
} from '../../../schemas/zod/inventory';
import { z } from 'zod';

const donationLinePayloadSchema = donationLineInsertSchema.omit({ donationId: true });

const donationWithLinesSchema = donationSelectSchema.extend({
  lines: z.array(donationLinePayloadSchema),
});

const getDonationsRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/api/v1/donations',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: donationSelectSchema.array(),
          },
        },
      },
    },
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const data = await db.select().from(donation).all() as DonationSelect[];
    return c.json(data, 200);
  }
});

const getDonationRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/api/v1/donations/{id}',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: donationWithLinesSchema,
          },
        },
      },
      404: {
        description: 'Donation not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [don] = await db.select().from(donation).where(eq(donation.id, id)).limit(1);
    
    if (!don) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Donation not found.' } }, 404);
    }
    
    const lines = await db
      .select({
        itemId: donationLine.itemId,
        quantity: donationLine.quantity,
      })
      .from(donationLine)
      .where(eq(donationLine.donationId, id));
    
    return c.json({ ...don, lines }, 200);
  }
});

const createDonationRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/api/v1/donations',
    request: {
      body: {
        content: {
          'application/json': {
            schema: donationWithLinesSchema,
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          'application/json': {
            schema: donationWithLinesSchema,
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
    const payload = await c.req.json() as { lines: z.infer<typeof donationLinePayloadSchema>[]; donorId: string; occurredAt: string | Date; note?: string | null };
    const { lines, ...donationData } = payload;
    const occurredAt = typeof donationData.occurredAt === 'string' ? new Date(donationData.occurredAt) : donationData.occurredAt;
    
    // Check for duplicate items
    const itemIds = lines.map((line) => line.itemId);
    if (new Set(itemIds).size !== itemIds.length) {
      return c.json({ error: { code: 'INVALID_VALUE', message: 'An item cannot appear twice in the same donation.' } }, 400);
    }
    
    const id = crypto.randomUUID();
    
    const lineInserts = lines.map((line) =>
      db
        .insert(donationLine)
        .values({
          donationId: id,
          itemId: line.itemId,
          quantity: line.quantity,
        })
    );
    
    await db.batch([
      db
        .insert(donation)
        .values({
          id,
          ...donationData,
          occurredAt,
        }),
      ...lineInserts,
    ]);
    
    const [data] = await db.select().from(donation).where(eq(donation.id, id)).limit(1);
    
    c.header('Location', `${c.req.path}/${id}`);
    return c.json({ ...data, lines }, 201);
  }
});

const receiveDonationRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/api/v1/donations/{id}/receive',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: donationWithLinesSchema,
          },
        },
      },
      400: {
        description: 'Invalid transition',
      },
      404: {
        description: 'Donation not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [existing] = await db.select().from(donation).where(eq(donation.id, id)).limit(1);
    
    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Donation not found.' } }, 404);
    }
    
    if (existing.status !== 'DRAFT') {
      return c.json({ error: { code: 'INVALID_TRANSITION', message: `Cannot receive a donation in status ${existing.status}.` } }, 400);
    }
    
    // Get lines to credit inventory
    const lines = await db
      .select({
        itemId: donationLine.itemId,
        quantity: donationLine.quantity,
      })
      .from(donationLine)
      .where(eq(donationLine.donationId, id));
    
    await db.batch([
      db
        .update(donation)
        .set({ status: 'RECEIVED' })
        .where(eq(donation.id, id)),
      ...lines.map((line) =>
        db
          .update(item)
          .set({ onHand: sql`${item.onHand} + ${line.quantity}` })
          .where(eq(item.id, line.itemId))
      ),
    ]);
    
    const [data] = await db.select().from(donation).where(eq(donation.id, id)).limit(1);
    const updatedLines = await db
      .select({
        itemId: donationLine.itemId,
        quantity: donationLine.quantity,
      })
      .from(donationLine)
      .where(eq(donationLine.donationId, id));
    
    return c.json({ ...data, lines: updatedLines }, 200);
  }
});

const updateDonationRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/api/v1/donations/{id}',
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: {
          'application/json': {
            schema: donationUpdateSchema,
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: donationSelectSchema,
          },
        },
      },
      400: {
        description: 'Invalid input',
      },
      404: {
        description: 'Donation not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [existing] = await db.select().from(donation).where(eq(donation.id, id)).limit(1);
    
    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Donation not found.' } }, 404);
    }
    
    const payload = await c.req.json();
    
    const [data] = await db
      .update(donation)
      .set(payload)
      .where(eq(donation.id, id))
      .returning();

    return c.json(data, 200);
  }
});

const deleteDonationRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete',
    path: '/api/v1/donations/{id}',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      204: {
        description: 'Donation deleted successfully',
      },
      404: {
        description: 'Donation not found',
      }
    }
  }),
  handler: async (c: Context<{ Bindings: Env }>) => {
    const db = drizzle(c.env.prod_sistema_doacoes_2);
    const id = c.req.param('id')!;
    
    const [removed] = await db
      .delete(donation)
      .where(eq(donation.id, id))
      .returning({ id: donation.id });

    if (!removed) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Donation not found.' } }, 404);
    }

    return c.body(null, 204);
  }
});

export const donationRoutes = [
  getDonationsRoute,
  getDonationRoute,
  createDonationRoute,
  receiveDonationRoute,
  updateDonationRoute,
  deleteDonationRoute
]