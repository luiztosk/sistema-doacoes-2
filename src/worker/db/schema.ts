import { sql } from "drizzle-orm";
import {
	index,
	integer,
	real,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-orm/zod";
import { z } from "zod";
export * from "./auth-schema";

export const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

const TIPOS_IMOVEL = ["ALUGADO", "PROPRIO"] as const;

const ESTADOS_CIVIS = [
  "SOLTEIRO",
  "CASADO",
  "DIVORCIADO",
  "VIUVO",
  "UNIAO_ESTAVEL",
] as const;

const STATUS_ITEM = ["AGUARDA_COLETA", "EM_ESTOQUE", "ENTREGUE"] as const;

const nomeNaoVazio = (schema: z.ZodString) =>
  schema.refine((valor) => valor.trim().length > 0, {
    error: "cannot be empty or only whitespace.",
  });

const naoNegativo = (schema: z.ZodNumber) =>
  schema.min(0, { error: "cannot be negative." });

const CEP_INVALIDO = "must have 8 digits, and nothing else.";

const cepDeEntrada = (schema: z.ZodString) =>
  schema
    .transform((valor) => valor.replaceAll("-", ""))
    .pipe(z.string().regex(/^\d{8}$/, { error: CEP_INVALIDO }));

const cepGuardado = (schema: z.ZodString) =>
  schema.regex(/^\d{8}$/, { error: CEP_INVALIDO });

const dataHoraDeEntrada = z.coerce.date().nullable().optional();

function compatAluguelImovel(valores: {
  tipoImovel?: string | null;
  valorAluguel?: number | null;
}) {
  const { tipoImovel, valorAluguel } = valores;
  if (tipoImovel == null) return true;
  if (tipoImovel === "PROPRIO") return valorAluguel == null;
  return valorAluguel != null && valorAluguel > 0;
}

const INCOMPAT_ALUGUEL =
  "'valorAluguel' only exists on an 'ALUGADO' property, and an 'ALUGADO' property requires a 'valorAluguel' greater than zero.";

export const assistido = sqliteTable("assistido", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  telefone: text("telefone"),
  email: text("email"),
  cep: text("cep"),
  logradouro: text("logradouro"),
  numero: text("numero"),
  complemento: text("complemento"),
  bairro: text("bairro"),
  cidade: text("cidade"),
  uf: text("uf", { enum: UFS }),
  tipoImovel: text("tipo_imovel", { enum: TIPOS_IMOVEL }),
  valorAluguel: integer("valor_aluguel"),
  estadoCivil: text("estado_civil", { enum: ESTADOS_CIVIS }),
  numeroAdultos: integer("numero_adultos"),
  criancasPequenas: integer("criancas_pequenas"),
  adolescentes: integer("adolescentes"),
  doentes: integer("doentes", { mode: "boolean" }),
  bolsaFamilia: integer("bolsa_familia", { mode: "boolean" }),
  aposentado: integer("aposentado", { mode: "boolean" }),
  pensao: integer("pensao", { mode: "boolean" }),
  cestaBasica: integer("cesta_basica", { mode: "boolean" }),
  atividadeRemunerada: integer("atividade_remunerada", { mode: "boolean" }),
  renda: real("renda"),
  criancaEscola: integer("crianca_escola", { mode: "boolean" }),
  observacoes: text("observacoes"),
});

const assistidoRefinements = {
  nome: nomeNaoVazio,
  cep: cepDeEntrada,
  valorAluguel: naoNegativo,
  renda: naoNegativo,
  numeroAdultos: naoNegativo,
  criancasPequenas: naoNegativo,
  adolescentes: naoNegativo,
};

export const assistidoInsertSchema = createInsertSchema(assistido, assistidoRefinements)
  .omit({ id: true })
  .strict()
  .refine(compatAluguelImovel, { error: INCOMPAT_ALUGUEL });

export const assistidoUpdateSchema = createUpdateSchema(assistido, assistidoRefinements)
  .omit({ id: true })
  .strict()
  .refine(
    (valores) =>
      valores.tipoImovel === undefined ||
      valores.valorAluguel === undefined ||
      compatAluguelImovel(valores),
    { error: INCOMPAT_ALUGUEL },
  );

export const assistidoSelectSchema = createSelectSchema(assistido, {
  ...assistidoRefinements,
  cep: cepGuardado,
});

export const doador = sqliteTable("doador", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  telefone: text("telefone"),
  email: text("email"),
  cep: text("cep"),
  logradouro: text("logradouro"),
  numero: text("numero"),
  complemento: text("complemento"),
  bairro: text("bairro"),
  cidade: text("cidade"),
  uf: text("uf", { enum: UFS }),
});

const doadorRefinements = {
  nome: nomeNaoVazio,
  cep: cepDeEntrada,
};

export const doadorInsertSchema = createInsertSchema(doador, doadorRefinements)
  .omit({ id: true })
  .strict();

export const doadorUpdateSchema = createUpdateSchema(doador, doadorRefinements)
  .omit({ id: true })
  .strict();

export const doadorSelectSchema = createSelectSchema(doador, {
  ...doadorRefinements,
  cep: cepGuardado,
});

export const categoriaItem = sqliteTable(
  "categoria_item",
  {
    id: text("id").primaryKey(),
    nome: text("nome").notNull(),
  },
  (t) => [uniqueIndex("categoria_item_nome_uniq").on(sql`lower(${t.nome})`)],
);

const categoriaItemRefinements = { nome: nomeNaoVazio };

export const categoriaItemInsertSchema = createInsertSchema(
  categoriaItem,
  categoriaItemRefinements,
)
  .omit({ id: true })
  .strict();

export const categoriaItemUpdateSchema = createUpdateSchema(
  categoriaItem,
  categoriaItemRefinements,
)
  .omit({ id: true })
  .strict();

export const categoriaItemSelectSchema = createSelectSchema(
  categoriaItem,
  categoriaItemRefinements,
);

export const nomeItem = sqliteTable(
  "nome_item",
  {
    id: text("id").primaryKey(),
    categoriaId: text("categoria_id")
      .notNull()
      .references(() => categoriaItem.id, { onDelete: "no action" }),
    nome: text("nome").notNull(),
  },
  (t) => [
    uniqueIndex("nome_item_nome_uniq").on(sql`lower(${t.nome})`),
    index("nome_item_categoriaId_idx").on(t.categoriaId),
  ],
);

const nomeItemRefinements = { nome: nomeNaoVazio };

export const nomeItemInsertSchema = createInsertSchema(nomeItem, nomeItemRefinements)
  .omit({ id: true })
  .strict();

export const nomeItemUpdateSchema = createUpdateSchema(nomeItem, nomeItemRefinements)
  .omit({ id: true })
  .strict();

export const nomeItemSelectSchema = createSelectSchema(nomeItem, nomeItemRefinements);

export const coleta = sqliteTable(
  "coleta",
  {
    id: text("id").primaryKey(),
    doadorId: text("doador_id")
      .notNull()
      .references(() => doador.id, { onDelete: "no action" }),
    dataHora: integer("data_hora", { mode: "timestamp" }),
  },
  (t) => [index("coleta_doadorId_idx").on(t.doadorId)],
);

export const coletaInsertSchema = createInsertSchema(coleta, {
  dataHora: dataHoraDeEntrada,
})
  .omit({ id: true })
  .strict();

export const coletaUpdateSchema = createUpdateSchema(coleta, {
  dataHora: dataHoraDeEntrada,
})
  .omit({ id: true })
  .strict();

export const coletaSelectSchema = createSelectSchema(coleta);

export const entrega = sqliteTable(
  "entrega",
  {
    id: text("id").primaryKey(),
    assistidoId: text("assistido_id")
      .notNull()
      .references(() => assistido.id, { onDelete: "no action" }),
    dataHora: integer("data_hora", { mode: "timestamp" }),
  },
  (t) => [index("entrega_assistidoId_idx").on(t.assistidoId)],
);

export const entregaInsertSchema = createInsertSchema(entrega, {
  dataHora: dataHoraDeEntrada,
})
  .omit({ id: true })
  .strict();

export const entregaUpdateSchema = createUpdateSchema(entrega, {
  dataHora: dataHoraDeEntrada,
})
  .omit({ id: true })
  .strict();

export const entregaSelectSchema = createSelectSchema(entrega);

export const item = sqliteTable(
  "item",
  {
    id: text("id").primaryKey(),
    nomeId: text("nome_id")
      .notNull()
      .references(() => nomeItem.id, { onDelete: "no action" }),
    status: text("status", { enum: STATUS_ITEM })
      .notNull()
      .default("AGUARDA_COLETA"),
    coletaId: text("coleta_id").references(() => coleta.id, {
      onDelete: "no action",
    }),
    entregaId: text("entrega_id").references(() => entrega.id, {
      onDelete: "no action",
    }),
  },
  (t) => [
    index("item_status_idx").on(t.status),
    index("item_coletaId_idx").on(t.coletaId),
    index("item_entregaId_idx").on(t.entregaId),
  ],
);

export const itemInsertSchema = createInsertSchema(item)
  .omit({ id: true })
  .strict();

export const itemUpdateSchema = createUpdateSchema(item)
  .omit({ id: true })
  .strict();

export const itemSelectSchema = createSelectSchema(item);
