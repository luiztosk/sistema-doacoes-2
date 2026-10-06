import {
    createInsertSchema,
    createSelectSchema,
    createUpdateSchema,
} from "drizzle-orm/zod";
import { z } from "zod";
import type { infer as ZodInfer } from "zod";
import { delivery, deliveryLine, donation, donationLine, inventoryAdjustment, inventoryCount, inventoryCountLine, inventoryItem, itemCategory } from "../db/inventory";

export type ItemCategorySelect = ZodInfer<typeof itemCategorySelectSchema>;
export type ItemCategoryInsert = ZodInfer<typeof itemCategoryInsertSchema>;
export type ItemCategoryUpdate = ZodInfer<typeof itemCategoryUpdateSchema>;

const itemCategoryRefinements = { name: z.string().trim().min(1) };
export const itemCategoryInsertSchema = createInsertSchema(
    itemCategory,
    itemCategoryRefinements,
)
    .omit({ id: true })
    .strict();
export const itemCategoryUpdateSchema = createUpdateSchema(
    itemCategory,
    itemCategoryRefinements,
)
    .omit({ id: true })
    .strict();
export const itemCategorySelectSchema = createSelectSchema(
    itemCategory,
    itemCategoryRefinements,
);

export type InventoryItemSelect = ZodInfer<typeof inventoryItemSelectSchema>;
export type InventoryItemInsert = ZodInfer<typeof inventoryItemInsertSchema>;
export type InventoryItemUpdate = ZodInfer<typeof inventoryItemUpdateSchema>;
export type InventoryItemTableView = Pick<
    ZodInfer<typeof inventoryItemTableViewSchema>,
    "id" | "name" | "categoryName" | "unit" | "onHand" | "reservedQuantity" | "available"
>;

const inventoryItemRefinements = {
    name: z.string().trim().min(1),
    onHand: z.number().int().nonnegative(),
    reservedQuantity: z.number().int().nonnegative(),
};
export const inventoryItemInsertSchema = createInsertSchema(
    inventoryItem,
    inventoryItemRefinements,
)
    .omit({ id: true, onHand: true, reservedQuantity: true })
    .strict();
export const inventoryItemUpdateSchema = createUpdateSchema(
    inventoryItem,
    inventoryItemRefinements,
)
    .omit({ id: true, onHand: true, reservedQuantity: true })
    .strict();
export const inventoryItemSelectSchema = createSelectSchema(
    inventoryItem,
    inventoryItemRefinements,
);

export const inventoryItemTableViewSchema = inventoryItemSelectSchema
    .omit({ categoryId: true })
    .extend({
        categoryName: itemCategorySelectSchema.shape.name.nullable(),
    });

export type DonationSelect = ZodInfer<typeof donationSelectSchema>;
export type DonationInsert = ZodInfer<typeof donationInsertSchema>;
export type DonationUpdate = ZodInfer<typeof donationUpdateSchema>;

export type DonationLineSelect = ZodInfer<typeof donationLineSelectSchema>;
export type DonationLineInsert = ZodInfer<typeof donationLineInsertSchema>;
export type DonationLineUpdate = ZodInfer<typeof donationLineUpdateSchema>;

const donationRefinements = { occurredAt: z.coerce.date() };
export const donationInsertSchema = createInsertSchema(
    donation,
    donationRefinements,
)
    .omit({ id: true, status: true })
    .strict();
export const donationUpdateSchema = createUpdateSchema(
    donation,
    donationRefinements,
)
    .omit({ id: true, status: true })
    .strict();
export const donationSelectSchema = createSelectSchema(
    donation,
    donationRefinements,
);

const donationLineRefinements = { quantity: z.number().int().positive() };
export const donationLineInsertSchema = createInsertSchema(
    donationLine,
    donationLineRefinements,
).strict();
export const donationLineUpdateSchema = createUpdateSchema(
    donationLine,
    donationLineRefinements,
).strict();
export const donationLineSelectSchema = createSelectSchema(
    donationLine,
    donationLineRefinements,
);

export type DeliverySelect = ZodInfer<typeof deliverySelectSchema>;
export type DeliveryInsert = ZodInfer<typeof deliveryInsertSchema>;
export type DeliveryUpdate = ZodInfer<typeof deliveryUpdateSchema>;

export type DeliveryLineSelect = ZodInfer<typeof deliveryLineSelectSchema>;
export type DeliveryLineInsert = ZodInfer<typeof deliveryLineInsertSchema>;
export type DeliveryLineUpdate = ZodInfer<typeof deliveryLineUpdateSchema>;

const deliveryRefinements = { occurredAt: z.coerce.date() };
export const deliveryInsertSchema = createInsertSchema(
    delivery,
    deliveryRefinements,
)
    .omit({ id: true, status: true })
    .strict();
export const deliveryUpdateSchema = createUpdateSchema(
    delivery,
    deliveryRefinements,
)
    .omit({ id: true, status: true })
    .strict();
export const deliverySelectSchema = createSelectSchema(
    delivery,
    deliveryRefinements,
);

const deliveryLineRefinements = { quantity: z.number().int().positive() };
export const deliveryLineInsertSchema = createInsertSchema(
    deliveryLine,
    deliveryLineRefinements,
).strict();

export const deliveryLineUpdateSchema = createUpdateSchema(
    deliveryLine,
    deliveryLineRefinements,
).strict();

export const deliveryLineSelectSchema = createSelectSchema(
    deliveryLine,
    deliveryLineRefinements,
);

export type InventoryCountSelect = ZodInfer<typeof inventoryCountSelectSchema>;
export type InventoryCountInsert = ZodInfer<typeof inventoryCountInsertSchema>;
export type InventoryCountUpdate = ZodInfer<typeof inventoryCountUpdateSchema>;

export type InventoryCountLineSelect = ZodInfer<typeof inventoryCountLineSelectSchema>;
export type InventoryCountLineInsert = ZodInfer<typeof inventoryCountLineInsertSchema>;
export type InventoryCountLineUpdate = ZodInfer<typeof inventoryCountLineUpdateSchema>;

export type InventoryAdjustmentSelect = ZodInfer<typeof inventoryAdjustmentSelectSchema>;
export type InventoryAdjustmentInsert = ZodInfer<typeof inventoryAdjustmentInsertSchema>;
export type InventoryAdjustmentUpdate = ZodInfer<typeof inventoryAdjustmentUpdateSchema>;

const inventoryCountRefinements = { occurredAt: z.coerce.date() };
export const inventoryCountInsertSchema = createInsertSchema(
    inventoryCount,
    inventoryCountRefinements,
)
    .omit({ id: true })
    .strict();
export const inventoryCountUpdateSchema = createUpdateSchema(
    inventoryCount,
    inventoryCountRefinements,
)
    .omit({ id: true })
    .strict();
export const inventoryCountSelectSchema = createSelectSchema(
    inventoryCount,
    inventoryCountRefinements,
);

const inventoryCountLineRefinements = {
    countedQuantity: z.number().int().positive(),
};
export const inventoryCountLineInsertSchema = createInsertSchema(
    inventoryCountLine,
    inventoryCountLineRefinements,
).strict();

export const inventoryCountLineUpdateSchema = createUpdateSchema(
    inventoryCountLine,
    inventoryCountLineRefinements,
).strict();
export const inventoryCountLineSelectSchema = createSelectSchema(
    inventoryCountLine,
    inventoryCountLineRefinements,
);

const inventoryAdjustmentRefinements = {
    delta: z.number().int(),
    occurredAt: z.coerce.date(),
};
export const inventoryAdjustmentInsertSchema = createInsertSchema(
    inventoryAdjustment,
    inventoryAdjustmentRefinements,
)
    .omit({ id: true })
    .strict();
export const inventoryAdjustmentUpdateSchema = createUpdateSchema(
    inventoryAdjustment,
    inventoryAdjustmentRefinements,
)
    .omit({ id: true })
    .strict();
export const inventoryAdjustmentSelectSchema = createSelectSchema(
    inventoryAdjustment,
    inventoryAdjustmentRefinements,
);