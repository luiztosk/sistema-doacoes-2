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

/**
 * A tela do ledger é a única que pagina no servidor — é a única tabela que
 * cresce sem limite. A resposta traz o total, porque a paginação precisa
 * saber quantas páginas existem.
 */
export const ledgerPageSchema = z
	.object({
		items: z.array(ledgerEntrySchema),
		total: z.number().int().nonnegative(),
		page: z.number().int().nonnegative(),
		pageSize: z.number().int().positive(),
	})
	.strict();

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
export type LedgerPage = ZodInfer<typeof ledgerPageSchema>;
export type LedgerListQuery = ZodInfer<typeof ledgerListQuerySchema>;
