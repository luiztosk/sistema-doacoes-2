// import { Context } from "hono";
// import { eq } from "drizzle-orm";
import { z, createRoute, OpenAPIHono } from '@hono/zod-openapi'
// import {
  // inventoryItem,
  // itemCategory,
// } from "../../schemas/db/inventory";
import {
  inventoryItemSelectSchema,
  // inventoryItemInsertSchema,
  // inventoryItemUpdateSchema,
  // inventoryItemTableViewSchema,
  // inventoryItemDetailsViewSchema,
  itemCategorySelectSchema,
} from "../../schemas/zod/inventory";
// import { apiError } from "../api/errors";
// import type { DrizzleD1Database } from "drizzle-orm/d1";
// import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
// import { ApiBindings, dbOf } from "../api/resource";
// import { drizzle } from "drizzle-orm/d1";

export const inventoryItems = new OpenAPIHono<{ Bindings: Env }>();

// Função auxiliar para lançar erro se registro não encontrado
// function firstOrThrow(records: unknown, action: string, name: string = "inventory item") {
//   const [record] = Array.isArray(records) ? records : [];
//   if (!record) {
//     throw new Error(`The database did not return the ${name} ${action}.`);
//   }
//   return record as Record<string, unknown>;
// }

// Função auxiliar para buscar item com categoryName
// async function withInventoryItemCategory(
//   db: DrizzleD1Database,
//   record: InferSelectModel<typeof inventoryItem>,
// ) {
//   const itemCategoryRecord = await db
//     .select({ name: itemCategory.name })
//     .from(itemCategory)
//     .where(eq(itemCategory.id, record.categoryId))
//     .limit(1);

//   return {
//     ...record,
//     categoryName: itemCategoryRecord[0]?.name ?? null,
//   };
// }
const inventoryRoute = createRoute({
  method: 'get',
  path: '/',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: inventoryItemSelectSchema.array(),
        },
      },
    },
  }
})

inventoryItems.openapi(inventoryRoute, (c) => {
  return c.json(
    [
      {
        id: "1",
        name: "Item 1",
        categoryName: "Category 1",
        unit: "Unit 1",
        onHand: 10,
        reservedQuantity: 2,
        available: 8,
      },
    ]
  )
// 	const db = drizzle(c.env.prod_sistema_doacoes_2);
//   const data = await db
//     .select({
//       id: inventoryItem.id,
//       name: inventoryItem.name,
//       categoryName: itemCategory.name,
//       unit: inventoryItem.unit,
//       onHand: inventoryItem.onHand,
//       reservedQuantity: inventoryItem.reservedQuantity,
//       available: inventoryItem.available,
//     })
//     .from(inventoryItem)
//     .leftJoin(itemCategory, eq(inventoryItem.categoryId, itemCategory.id))
  
//   try {
//     inventoryItemTableViewSchema.array().parse(data);
//     return c.json({ data });
//   } catch (error) {
//     return c.json({ error: "Data validation failed." }, 500);
//   }
});

inventoryItems.doc('/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'Inventory Items API',
    version: '1.0.0',
  },

})

// inventoryItems.get("/:id", async (c: Context<ApiBindings>) => {
//   const db = dbOf(c);
//   const id = c.req.param("id") as string;
//   const item = await db
//     .select()
//     .from(inventoryItem)
//     .where(eq(inventoryItem.id, id))
//     .limit(1);

//   const categories = await db
//     .select()
//     .from(itemCategory);
  
//   const data = {
//     item: item,
//     categories: categories,
//   };

//   inventoryItemDetailsViewSchema.safeParse(data)
//   return c.json({ data });
// });

// // POST /inventory-items
// inventoryItems.post("/", async (c: Context<ApiBindings>) => {
//   const db = dbOf(c);
//   const payload = parseBody(
//     await readJsonObject(c),
//     inventoryItemInsertSchema,
//     "create",
//   );

//   const data = firstOrThrow(
//     await db
//       .insert(inventoryItem)
//       .values({
//         id: crypto.randomUUID(),
//         ...payload,
//       } as InferInsertModel<typeof inventoryItem>)
//       .returning(),
//     "created",
//     "Inventory item",
//   );

//   c.header("Location", `${c.req.path}/${data.id}`);
//   return c.json({ data }, 201);
// });

// PATCH /inventory-items/:id
// inventoryItems.patch("/:id", async (c: Context<ApiBindings>) => {
//   const db = dbOf(c);
//   const id = c.req.param("id") as string;
//   const data = await db
//     .select()
//     .from(inventoryItem)
//     .where(eq(inventoryItem.id, id))
//     .limit(1);

//   if (!data || data.length === 0) {
//     throw apiError(404, "NOT_FOUND", "Inventory item not found.");
//   }
//   // Ensure item exists
//   // await findById(db, inventoryItem, id, "Inventory item");
//   // const payload = parseBody(await readJsonObject(c), inventoryItemUpdateSchema, "update");

//   // NOTE: validate is not used here as inventoryItem has no custom validate in registerResource
//   // If needed, pass validate function similarly to how it's done in registerResource
//   await db
//       .update(inventoryItemUpdateSchema.parse(c.req.json()))
//       .set(
//       .where(eq(inventoryItem.id, id))
//       .returning(),
//     "updated",
//     "Inventory item",
//   );

//   return c.json({ data });
// });

// // DELETE /inventory-items/:id
// inventoryItems.delete("/:id", async (c: Context<ApiBindings>) => {
//   const id = c.req.param("id") as string;
//   const [removed] = await dbOf(c)
//     .delete(inventoryItem)
//     .where(eq(inventoryItem.id, id))
//     .returning({ id: inventoryItem.id });

//   if (!removed) {
//     throw apiError(404, "NOT_FOUND", "Inventory item not found.");
//   }

//   return c.body(null, 204);
// });