import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
// import { organization } from "./auth-schema";
export * from "./auth-schema";

export const assistido = sqliteTable("assistido", {
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
  uf: text("uf", { length: 2 }),
  tipoImovel: text("tipo_imovel", { enum: ["ALUGADO", "PROPRIO"] }),
  valorAluguel: integer("valor_aluguel"),
  estadoCivil: text("estado_civil", {
    enum: ["SOLTEIRO", "CASADO", "DIVORCIADO", "VIUVO", "UNIAO_ESTAVEL"],
  }),
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

export const doador = sqliteTable("doador", {
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
  uf: text("uf", { length: 2 }),
});

export const categoriaItem = sqliteTable("categoria_item", {
  id: text("id").primaryKey(),
  // organizationId: text("organization_id")
  //   .notNull()
  //   .references(() => organization.id),
  nome: text("nome").notNull(),
});

export const nomeItem = sqliteTable("nome_item", {
  id: text("id").primaryKey(),
  // organizationId: text("organization_id")
  //   .notNull()
  //   .references(() => organization.id),
  categoriaId: text("categoria_id")
    .notNull()
    .references(() => categoriaItem.id),
  nome: text("nome").notNull(),
});

export const coleta = sqliteTable("coleta", {
  id: text("id").primaryKey(),
  // organizationId: text("organization_id")
  //   .notNull()
  //   .references(() => organization.id),
  doadorId: text("doador_id").references(() => doador.id),
  dataHora: integer("data_hora", { mode: "timestamp" }),
});

export const entrega = sqliteTable("entrega", {
  id: text("id").primaryKey(),
  // organizationId: text("organization_id")
  //   .notNull()
  //   .references(() => organization.id),
  assistidoId: text("assistido_id").references(() => assistido.id),
  dataHora: integer("data_hora", { mode: "timestamp" }),
});

export const item = sqliteTable("item", {
  id: text("id").primaryKey(),
  // organizationId: text("organization_id")
  //   .notNull()
  //   .references(() => organization.id),
  nomeId: text("nome_id").notNull().references(() => nomeItem.id),
  status: text("status", {
    enum: ["AGUARDA_COLETA", "EM_ESTOQUE", "ENTREGUE"],
  })
    .notNull()
    .default("AGUARDA_COLETA"),
  coletaId: text("coleta_id").references(() => coleta.id),
  entregaId: text("entrega_id").references(() => entrega.id),
  doadorId: text("doador_id").references(() => doador.id),
  assistidoId: text("assistido_id").references(() => assistido.id),
});