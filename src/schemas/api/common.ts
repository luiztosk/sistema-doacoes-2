import { z } from "zod";
import { ufSchema } from "./enums";

export const idSchema = z.uuid({
	error: "O id precisa ser um UUID.",
});

export const occurredAtSchema = z.iso.datetime({ offset: true });

export const idParamsSchema = z.object({ id: idSchema });

export const errorCodeSchema = z.enum([
	"REQUIRED_FIELD",
	"UNKNOWN_FIELD",
	"READ_ONLY_FIELD",
	"EMPTY_UPDATE",
	"INVALID_VALUE",
	"INVALID_REFERENCE",
	"INVALID_TRANSITION",
	"INSUFFICIENT_STOCK",
	"NEGATIVE_STOCK",
	"INVALID_RELEASE",
	"INVALID_JSON",
	"INVALID_BODY",
	"NOT_FOUND",
	"CONFLICT",
	"UNSUPPORTED_MEDIA_TYPE",
	"INTERNAL_ERROR",
]);

export const errorSchema = z
	.object({
	code: errorCodeSchema,
	message: z.string(),
	})
	.strict();

export const dataSchema = z.object({ data: z.unknown() });

export const addressFields = {
	cep: z
		.string()
		.regex(/^\d{8}$/, { error: "O CEP precisa ter 8 dígitos." })
		.optional(),
	logradouro: z
		.string()
		.trim()
		.min(1, { error: "O logradouro não pode ficar em branco." })
		.optional(),
	numero: z
		.string()
		.trim()
		.min(1, { error: "O número não pode ficar em branco." })
		.optional(),
	complemento: z.string().trim().optional(),
	bairro: z
		.string()
		.trim()
		.min(1, { error: "O bairro não pode ficar em branco." }),
	cidade: z
		.string()
		.trim()
		.min(1, { error: "A cidade não pode ficar em branco." }),
	uf: ufSchema,
};

export const paginationQuerySchema = z.object({
	page: z.coerce
		.number()
		.int()
		.min(0, { error: "A página começa em zero." })
		.default(0),
	pageSize: z.coerce
		.number()
		.int()
		.min(1, { error: "O tamanho da página precisa ser pelo menos 1." })
		.max(100, { error: "O tamanho da página precisa ser no máximo 100." })
		.default(50),
});
