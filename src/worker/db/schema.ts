import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	real,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
// import { organization } from "./auth-schema";
export * from "./auth-schema";

/**
 * The 27 federative units, in one place because the same list has to be the
 * TypeScript enum of `assistido.uf` and `doador.uf` *and* the `IN (...)` list of
 * the `CHECK` that makes the D1 reject anything else: drizzle's `text({ enum })`
 * only types the column, it emits nothing to the DDL.
 */
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

/**
 * `'AC', 'AL', ...` for a `CHECK ... IN (...)` clause. It has to be `raw` because
 * a DDL `CHECK` is not a statement drizzle can bind parameters to: with `sql`
 * the placeholders reach the migration file as literal `?`.
 */
const lista = (valores: readonly string[]) =>
  sql.raw(valores.map((valor) => `'${valor}'`).join(", "));

/**
 * Nullable columns need no `IS NULL` guard: a SQLite `CHECK` is violated only by
 * an expression that evaluates to false, and `NULL IN (...)` is neither.
 */
const booleanoValido = (coluna: unknown) =>
  sql`${coluna} IN (0, 1)`;

export const assistido = sqliteTable(
  "assistido",
  {
    id: text("id").primaryKey(),
    // organizationId: text("organization_id")
    //   .notNull()
    //   .references(() => organization.id),
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
  },
  (t) => [
    check("assistido_nome_nao_vazio", sql`length(trim(${t.nome})) > 0`),
    // ViaCEP (#16) stores the 8 digits it returns; the hyphenated form is a
    // display convention that the zod layer strips on input.
    check(
      "assistido_cep_formato",
      sql`${t.cep} IS NULL OR (length(${t.cep}) = 8 AND ${t.cep} NOT GLOB '*[^0-9]*')`,
    ),
    check(
      "assistido_uf_valida",
      sql`${t.uf} IS NULL OR ${t.uf} IN (${lista(UFS)})`,
    ),
    check(
      "assistido_tipo_imovel_valido",
      sql`${t.tipoImovel} IS NULL OR ${t.tipoImovel} IN (${lista(TIPOS_IMOVEL)})`,
    ),
    // The rent has to agree with the property type in both directions: a rented
    // property has to say how much, an owned one has to leave the field out
    // (`IS NULL`, not `= NULL`, which is never true in SQL and would drop the
    // whole branch). Both sides are `NOT NULL`-free, so an all-null row passes.
    check(
      "assistido_valor_aluguel_compatipo_imovel",
      sql`${t.tipoImovel} IS NULL OR (${t.tipoImovel} = 'PROPRIO' AND ${t.valorAluguel} IS NULL) OR (${t.tipoImovel} = 'ALUGADO' AND ${t.valorAluguel} > 0)`,
    ),
    check(
      "assistido_estado_civil_valido",
      sql`${t.estadoCivil} IS NULL OR ${t.estadoCivil} IN (${lista(ESTADOS_CIVIS)})`,
    ),
    check(
      "assistido_valor_aluguel_nao_negativo",
      sql`${t.valorAluguel} IS NULL OR ${t.valorAluguel} >= 0`,
    ),
    check(
      "assistido_renda_nao_negativa",
      sql`${t.renda} IS NULL OR ${t.renda} >= 0`,
    ),
    check(
      "assistido_numero_adultos_nao_negativo",
      sql`${t.numeroAdultos} IS NULL OR ${t.numeroAdultos} >= 0`,
    ),
    check(
      "assistido_criancas_pequenas_nao_negativo",
      sql`${t.criancasPequenas} IS NULL OR ${t.criancasPequenas} >= 0`,
    ),
    check(
      "assistido_adolescentes_nao_negativo",
      sql`${t.adolescentes} IS NULL OR ${t.adolescentes} >= 0`,
    ),
    check("assistido_doentes_valido", booleanoValido(t.doentes)),
    check("assistido_bolsa_familia_valido", booleanoValido(t.bolsaFamilia)),
    check("assistido_aposentado_valido", booleanoValido(t.aposentado)),
    check("assistido_pensao_valido", booleanoValido(t.pensao)),
    check("assistido_cesta_basica_valido", booleanoValido(t.cestaBasica)),
    check(
      "assistido_atividade_remunerada_valido",
      booleanoValido(t.atividadeRemunerada),
    ),
    check("assistido_crianca_escola_valido", booleanoValido(t.criancaEscola)),
  ],
);

export const doador = sqliteTable(
  "doador",
  {
    id: text("id").primaryKey(),
    // organizationId: text("organization_id")
    //   .notNull()
    //   .references(() => organization.id),
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
  },
  (t) => [
    check("doador_nome_nao_vazio", sql`length(trim(${t.nome})) > 0`),
    check(
      "doador_uf_valida",
      sql`${t.uf} IS NULL OR ${t.uf} IN (${lista(UFS)})`,
    ),
    check(
      "doador_cep_formato",
      sql`${t.cep} IS NULL OR (length(${t.cep}) = 8 AND ${t.cep} NOT GLOB '*[^0-9]*')`,
    ),
  ],
);

export const categoriaItem = sqliteTable(
  "categoria_item",
  {
    id: text("id").primaryKey(),
    // organizationId: text("organization_id")
    //   .notNull()
    //   .references(() => organization.id),
    nome: text("nome").notNull(),
  },
  (t) => [
    check("categoria_item_nome_nao_vazio", sql`length(trim(${t.nome})) > 0`),
    // The catalog has no duplicates: "Arroz 5kg" is one `nome_item`, and the
    // same name in a different case is the same name. `UNIQUE` on the column
    // would be case-sensitive (SQLite's default collation is BINARY) and is a
    // table constraint, which SQLite can only add by rebuilding the table; an
    // index on `lower(nome)` is a plain `CREATE UNIQUE INDEX`.
    uniqueIndex("categoria_item_nome_uniq").on(sql`lower(${t.nome})`),
  ],
);

export const nomeItem = sqliteTable(
  "nome_item",
  {
    id: text("id").primaryKey(),
    // organizationId: text("organization_id")
    //   .notNull()
    //   .references(() => organization.id),
    categoriaId: text("categoria_id")
      .notNull()
      .references(() => categoriaItem.id, { onDelete: "no action" }),
    nome: text("nome").notNull(),
  },
  (t) => [
    check(
      "nome_item_nome_nao_vazio",
      sql`length(trim(${t.nome})) > 0`,
    ),
    uniqueIndex("nome_item_nome_uniq").on(sql`lower(${t.nome})`),
    index("nome_item_categoriaId_idx").on(t.categoriaId),
  ],
);

/**
 * `doador_id`/`assistido_id` are the source of truth for who donated and who
 * received. An item reads them through `coleta_id`/`entrega_id` — the copies that
 * used to live on `item` could disagree with the event they came from, and in the
 * mock data 12 of 44 items disagreed about the recipient.
 */
export const coleta = sqliteTable(
  "coleta",
  {
    id: text("id").primaryKey(),
    // organizationId: text("organization_id")
    //   .notNull()
    //   .references(() => organization.id),
    doadorId: text("doador_id")
      .notNull()
      .references(() => doador.id, { onDelete: "no action" }),
    dataHora: integer("data_hora", { mode: "timestamp" }),
  },
  (t) => [index("coleta_doadorId_idx").on(t.doadorId)],
);

export const entrega = sqliteTable(
  "entrega",
  {
    id: text("id").primaryKey(),
    // organizationId: text("organization_id")
    //   .notNull()
    //   .references(() => organization.id),
    assistidoId: text("assistido_id")
      .notNull()
      .references(() => assistido.id, { onDelete: "no action" }),
    dataHora: integer("data_hora", { mode: "timestamp" }),
  },
  (t) => [index("entrega_assistidoId_idx").on(t.assistidoId)],
);

export const item = sqliteTable(
  "item",
  {
    id: text("id").primaryKey(),
    // organizationId: text("organization_id")
    //   .notNull()
    //   .references(() => organization.id),
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
    check(
      "item_status_valido",
      sql`${t.status} IN (${lista(STATUS_ITEM)})`,
    ),
    // A delivered item must point at the delivery, and a delivery always comes
    // from a collection — the two checks the mock data already satisfies.
    check(
      "item_entregue_exige_entrega",
      sql`${t.status} <> 'ENTREGUE' OR ${t.entregaId} IS NOT NULL`,
    ),
    check(
      "item_entrega_exige_coleta",
      sql`${t.entregaId} IS NULL OR ${t.coletaId} IS NOT NULL`,
    ),
    index("item_status_idx").on(t.status),
    index("item_coletaId_idx").on(t.coletaId),
    index("item_entregaId_idx").on(t.entregaId),
  ],
);
