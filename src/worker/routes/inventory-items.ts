import { Context, Hono } from "hono";
import { eq } from "drizzle-orm";
import {
  inventoryItem,
  itemCategory,
} from "../../schemas/db/inventory";
import {
  inventoryItemInsertSchema,
  inventoryItemUpdateSchema,
  inventoryItemTableViewSchema,
} from "../../schemas/zod/inventory";
import { apiError, parseBody, readJsonObject } from "../api/errors";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { ApiBindings, dbOf, findById } from "../api/resource";

export const inventoryItems = new Hono();

// Função auxiliar para lançar erro se registro não encontrado
function firstOrThrow(records: unknown, action: string, name: string = "inventory item") {
  const [record] = Array.isArray(records) ? records : [];
  if (!record) {
    throw new Error(`The database did not return the ${name} ${action}.`);
  }
  return record as Record<string, unknown>;
}

// Função auxiliar para buscar item com categoryName
async function withInventoryItemCategory(
  db: DrizzleD1Database,
  record: InferSelectModel<typeof inventoryItem>,
) {
  const itemCategoryRecord = await db
    .select({ name: itemCategory.name })
    .from(itemCategory)
    .where(eq(itemCategory.id, record.categoryId))
    .limit(1);

  return {
    ...record,
    categoryName: itemCategoryRecord[0]?.name ?? null,
  };
}

// GET /inventory-items
inventoryItems.get("/", async (c: Context<ApiBindings>) => {
  const db = dbOf(c);
  const data = await db
    .select({
      id: inventoryItem.id,
      name: inventoryItem.name,
      categoryName: itemCategory.name,
      unit: inventoryItem.unit,
      onHand: inventoryItem.onHand,
      reservedQuantity: inventoryItem.reservedQuantity,
      available: inventoryItem.available,
    })
    .from(inventoryItem)
    .leftJoin(itemCategory, eq(inventoryItem.categoryId, itemCategory.id))
  
  inventoryItemTableViewSchema.array().parse(data);
  return c.json({ data });
});

// GET /inventory-items/:id
inventoryItems.get("/:id", async (c: Context<ApiBindings>) => {
  const db = dbOf(c);
  const id = c.req.param("id") as string;
  const existing = await findById(db, inventoryItem, id, "Inventory item");
  const data = await withInventoryItemCategory(db, existing);
  
  // Validate response matches expected schema
  inventoryItemTableViewSchema.safeParse(data);
  
  return c.json({ data });
});

// POST /inventory-items
inventoryItems.post("/", async (c: Context<ApiBindings>) => {
  const db = dbOf(c);
  const payload = parseBody(
    await readJsonObject(c),
    inventoryItemInsertSchema,
    "create",
  );

  const data = firstOrThrow(
    await db
      .insert(inventoryItem)
      .values({
        id: crypto.randomUUID(),
        ...payload,
      } as InferInsertModel<typeof inventoryItem>)
      .returning(),
    "created",
    "Inventory item",
  );

  c.header("Location", `${c.req.path}/${data.id}`);
  return c.json({ data }, 201);
});

// PATCH /inventory-items/:id
inventoryItems.patch("/:id", async (c: Context<ApiBindings>) => {
  const db = dbOf(c);
  const id = c.req.param("id") as string;
  // Ensure item exists
  await findById(db, inventoryItem, id, "Inventory item");
  const payload = parseBody(await readJsonObject(c), inventoryItemUpdateSchema, "update");

  // NOTE: validate is not used here as inventoryItem has no custom validate in registerResource
  // If needed, pass validate function similarly to how it's done in registerResource
  const data = firstOrThrow(
    await db
      .update(inventoryItem)
      .set(payload as Partial<InferInsertModel<typeof inventoryItem>>)
      .where(eq(inventoryItem.id, id))
      .returning(),
    "updated",
    "Inventory item",
  );

  return c.json({ data });
});

// DELETE /inventory-items/:id
inventoryItems.delete("/:id", async (c: Context<ApiBindings>) => {
  const id = c.req.param("id") as string;
  const [removed] = await dbOf(c)
    .delete(inventoryItem)
    .where(eq(inventoryItem.id, id))
    .returning({ id: inventoryItem.id });

  if (!removed) {
    throw apiError(404, "NOT_FOUND", "Inventory item not found.");
  }

  return c.body(null, 204);
});