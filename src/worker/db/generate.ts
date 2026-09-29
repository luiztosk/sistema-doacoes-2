import fs from "fs";
import path from "path";
import { getTableColumns } from "drizzle-orm";
import { z } from "zod";
import { fake, getFaker, seed, setFaker } from "zod-schema-faker/v4";
import { faker as fakerPTBR } from "@faker-js/faker/locale/pt_BR";
import {
	assistido,
	assistidoSelectSchema,
	categoriaItemSelectSchema,
	coletaSelectSchema,
	doadorSelectSchema,
	entregaSelectSchema,
	item,
	itemSelectSchema,
	nomeItemSelectSchema,
} from "./schema";

setFaker(fakerPTBR);
seed(42);

const faker = getFaker();
const BASE_DIR = "mock_data";

const ROWS_PER_TABLE = {
	assistido: 100,
	doador: 25,
	coleta: 80,
	entrega: 60,
	item: 500,
} as const;

const ENUM_VALUES = {
	uf: getTableColumns(assistido).uf.enumValues,
	tipoImovel: getTableColumns(assistido).tipoImovel.enumValues,
	estadoCivil: getTableColumns(assistido).estadoCivil.enumValues,
	status: getTableColumns(item).status.enumValues,
} as const;

const TIPO_DE_LOGRADOURO = [
	"Rua",
	"Avenida",
	"Travessa",
	"Alameda",
	"Praça",
	"Rodovia",
	"Estrada",
];

const BAIRRO = [
	"Centro",
	"Jardim América",
	"Vila Nova",
	"Santa Rosa",
	"São Jorge",
	"Bela Vista",
	"Parque Central",
	"Alto da Serra",
	"Vila Bela",
	"Nova Esperança",
];

const OBSERVACAO = [
	"Prefere receber pelo período da manhã.",
	"Faz acompanhar a vizinha nas entregas.",
	"Já esteve cadastrado em outra门市 da cidade.",
	"Solicita aviso por telefone um dia antes.",
	"Conta com apoio da associação de bairro.",
	null,
];

const TITULO = /^(Sr|Sra|Srta|Srto|Dona|Dono)\.?\s+/i;

const JANELA = {
	coleta: { de: Date.UTC(2026, 0, 5), ate: Date.UTC(2026, 2, 31) },
	entrega: { de: Date.UTC(2026, 3, 5), ate: Date.UTC(2026, 5, 30) },
} as const;

type Municipio = { cidade: string; uf: string };
type Catalogo = { categoria: string; itens: string[] };

type AssistidoRow = z.infer<typeof assistidoSelectSchema>;
type DoadorRow = z.infer<typeof doadorSelectSchema>;
type CategoriaItemRow = z.infer<typeof categoriaItemSelectSchema>;
type NomeItemRow = z.infer<typeof nomeItemSelectSchema>;
type ColetaRow = z.infer<typeof coletaSelectSchema>;
type EntregaRow = z.infer<typeof entregaSelectSchema>;
type ItemRow = z.infer<typeof itemSelectSchema>;

export type SeedData = {
	assistido: AssistidoRow[];
	doador: DoadorRow[];
	categoriaItem: CategoriaItemRow[];
	nomeItem: NomeItemRow[];
	coleta: ColetaRow[];
	entrega: EntregaRow[];
	item: ItemRow[];
};

function lerJson<T>(arquivo: string): T {
	return JSON.parse(
		fs.readFileSync(path.join(BASE_DIR, arquivo), "utf-8"),
	) as T;
}

function validar<T>(schema: z.ZodType, tabela: string, linha: unknown): T {
	const resultado = schema.safeParse(linha);
	if (resultado.success) return resultado.data as T;

	const detalhe = resultado.error.issues
		.map((issue) => `${issue.path.join(".") || "(linha)"}: ${issue.message}`)
		.join("; ");

	throw new Error(`${tabela} gerada fora do schema — ${detalhe}`);
}

function nomeDePessoa(): string {
	return faker.person.fullName().replace(TITULO, "").trim();
}

function telefoneBrasileiro(): string {
	const ddd = String(faker.number.int({ min: 11, max: 99 }));
	const celular = String(faker.number.int({ min: 900000000, max: 999999999 }));
	return `(${ddd}) ${celular.slice(0, 5)}-${celular.slice(5)}`;
}

function endereco(municipios: Municipio[]) {
	const municipio = faker.helpers.arrayElement(municipios);
	return {
		cep: faker.location.zipCode().replace("-", ""),
		logradouro: `${faker.helpers.arrayElement(TIPO_DE_LOGRADOURO)} ${faker.person.firstName()} ${faker.person.lastName()}`,
		numero: faker.location.buildingNumber(),
		complemento: faker.datatype.boolean() ? faker.location.secondaryAddress() : null,
		bairro: faker.helpers.arrayElement(BAIRRO),
		cidade: municipio.cidade,
		uf: municipio.uf,
	};
}

function instante(janela: { de: number; ate: number }): Date {
	return new Date(faker.number.int({ min: janela.de, max: janela.ate }));
}

function doisDecimais(valor: number): number {
	return Math.round(valor * 100) / 100;
}

function criarAssistidos(municipios: Municipio[]): AssistidoRow[] {
	return Array.from({ length: ROWS_PER_TABLE.assistido }, () => {
		const aposentado = faker.datatype.boolean();
		const criancasPequenas = fake(z.int().min(0).max(4));
		const adolescentes = fake(z.int().min(0).max(3));
		const tipoImovel = fake(z.enum(ENUM_VALUES.tipoImovel));

		const linha = {
			id: fake(z.uuidv4()),
			nome: nomeDePessoa(),
			telefone: telefoneBrasileiro(),
			email: faker.internet.email(),
			...endereco(municipios),
			tipoImovel,
			valorAluguel:
				tipoImovel === "ALUGADO" ? fake(z.int().min(200).max(3000)) : null,
			estadoCivil: fake(z.enum(ENUM_VALUES.estadoCivil)),
			numeroAdultos: fake(z.int().min(1).max(5)),
			criancasPequenas,
			adolescentes,
			doentes: faker.datatype.boolean(),
			bolsaFamilia: faker.datatype.boolean(),
			aposentado,
			pensao: aposentado ? true : faker.datatype.boolean(),
			cestaBasica: faker.datatype.boolean(),
			atividadeRemunerada: aposentado ? false : faker.datatype.boolean(),
			renda: doisDecimais(fake(z.number().min(0).max(9000))),
			criancaEscola:
				criancasPequenas + adolescentes > 0 ? faker.datatype.boolean() : false,
			observacoes: faker.helpers.arrayElement(OBSERVACAO),
		};

		return validar(assistidoSelectSchema, "assistido", linha);
	});
}

function criarDoadores(municipios: Municipio[]): DoadorRow[] {
	return Array.from({ length: ROWS_PER_TABLE.doador }, () => {
		const linha = {
			id: fake(z.uuidv4()),
			nome: nomeDePessoa(),
			telefone: telefoneBrasileiro(),
			email: faker.internet.email(),
			...endereco(municipios),
		};

		return validar(doadorSelectSchema, "doador", linha);
	});
}

function criarCatalogo(catalogo: Catalogo[]) {
	const categorias: CategoriaItemRow[] = [];
	const nomes: NomeItemRow[] = [];

	for (const grupo of catalogo) {
		const id = fake(z.uuidv4());
		categorias.push(
			validar(categoriaItemSelectSchema, "categoria_item", {
				id,
				nome: grupo.categoria,
			}),
		);

		for (const nome of grupo.itens) {
			nomes.push(
				validar(nomeItemSelectSchema, "nome_item", {
					id: fake(z.uuidv4()),
					categoriaId: id,
					nome,
				}),
			);
		}
	}

	return { categorias, nomes };
}

function criarColetas(doadores: DoadorRow[]): ColetaRow[] {
	return Array.from({ length: ROWS_PER_TABLE.coleta }, () => {
		const doadorId = faker.helpers.arrayElement(doadores).id;
		return validar(coletaSelectSchema, "coleta", {
			id: fake(z.uuidv4()),
			doadorId,
			dataHora: instante(JANELA.coleta),
		});
	});
}

function criarEntregas(assistidos: AssistidoRow[]): EntregaRow[] {
	return Array.from({ length: ROWS_PER_TABLE.entrega }, () => {
		const assistidoId = faker.helpers.arrayElement(assistidos).id;
		return validar(entregaSelectSchema, "entrega", {
			id: fake(z.uuidv4()),
			assistidoId,
			dataHora: instante(JANELA.entrega),
		});
	});
}

function sortearStatus(quantidade: number): string[] {
	const pesos: Record<string, number> = {
		AGUARDA_COLETA: 0.4,
		EM_ESTOQUE: 0.25,
		ENTREGUE: 0.35,
	};

	const sorteados: string[] = [];
	for (const [status, peso] of Object.entries(pesos)) {
		const vezes = Math.round(quantidade * peso);
		for (let i = 0; i < vezes; i += 1) sorteados.push(status);
	}

	return faker.helpers.shuffle(sorteados);
}

function criarItens(
	nomes: NomeItemRow[],
	coletas: ColetaRow[],
	entregas: EntregaRow[],
): ItemRow[] {
	const statusDeCadaItem = sortearStatus(ROWS_PER_TABLE.item);

	return statusDeCadaItem.map((status) => {
		const nomeId = faker.helpers.arrayElement(nomes).id;
		const coletado = status === "AGUARDA_COLETA" ? null : faker.helpers.arrayElement(coletas).id;
		const entregue =
			status === "ENTREGUE" ? faker.helpers.arrayElement(entregas).id : null;

		return validar(itemSelectSchema, "item", {
			id: fake(z.uuidv4()),
			nomeId,
			status,
			coletaId: coletado,
			entregaId: entregue,
		});
	});
}

export function gerarSeed(): SeedData {
	const municipios = lerJson<Municipio[]>("municipios.json");
	const catalogo = lerJson<Catalogo[]>("catalogo.json");
	const { categorias, nomes } = criarCatalogo(catalogo);

	const assistidos = criarAssistidos(municipios);
	const doadores = criarDoadores(municipios);
	const coletas = criarColetas(doadores);
	const entregas = criarEntregas(assistidos);
	const itens = criarItens(nomes, coletas, entregas);

	return {
		assistido: assistidos,
		doador: doadores,
		categoriaItem: categorias,
		nomeItem: nomes,
		coleta: coletas,
		entrega: entregas,
		item: itens,
	};
}
