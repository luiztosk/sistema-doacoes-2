import { z } from "zod";
import type { infer as ZodInfer } from "zod";
import { idSchema, occurredAtSchema, paginationQuerySchema } from "./common";
import { ledgerKindSchema } from "./enums";

export const ledgerEntrySchema = z
	.object({
	id: idSchema,
	seq: z.number().int().positive(),
	itemId: idSchema,
	itemName: z.string(),
	kind: ledgerKindSchema,
	onHandDelta: z.number().int(),
	reservedDelta: z.number().int(),
	countedQuantity: z.number().int().nonnegative().nullish(),
	refId: idSchema,
	occurredAt: occurredAtSchema,
	})
	.strict();

export const ledgerListSchema = z.array(ledgerEntrySchema);

export const ledgerListQuerySchema = paginationQuerySchema.extend({
	itemId: idSchema.optional(),
	kind: ledgerKindSchema.optional(),
	refId: idSchema.optional(),
	from: occurredAtSchema.optional(),
	to: occurredAtSchema.optional(),
	sort: z.enum(["seq", "occurredAt"]).default("seq"),
});

export type LedgerEntry = ZodInfer<typeof ledgerEntrySchema>;
export type LedgerList = ZodInfer<typeof ledgerListSchema>;
export type LedgerListQuery = ZodInfer<typeof ledgerListQuerySchema>;
