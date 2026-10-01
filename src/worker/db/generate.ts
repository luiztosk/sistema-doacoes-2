import fs from "fs";
import path from "path";
import { getTableColumns } from "drizzle-orm";
import { z } from "zod";
import { fake, getFaker, seed, setFaker } from "zod-schema-faker/v4";
import { faker as fakerPTBR } from "@faker-js/faker/locale/pt_BR";
import {
	assistido,
	assistidoSelectSchema,
	deliveryLineSelectSchema,
	deliverySelectSchema,
	donationLineSelectSchema,
	donationSelectSchema,
	doadorSelectSchema,
	inventoryAdjustmentSelectSchema,
	inventoryCountLineSelectSchema,
	inventoryCountSelectSchema,
	inventoryItem,
	inventoryItemSelectSchema,
	itemCategorySelectSchema,
} from "./schema";

setFaker(fakerPTBR);
seed(42);

const faker = getFaker();
const BASE_DIR = "mock_data";

const ROWS_PER_TABLE = {
	assistido: 100,
	doador: 25,
	donation: 45,
	delivery: 30,
	inventoryCount: 3,
	adjustment: 6,
} as const;

const ENUM_VALUES = {
	uf: getTableColumns(assistido).uf.enumValues,
	tipoImovel: getTableColumns(assistido).tipoImovel.enumValues,
	estadoCivil: getTableColumns(assistido).estadoCivil.enumValues,
	unit: getTableColumns(inventoryItem).unit.enumValues,
} as const;

const ADJUSTMENT_REASONS = ["DONOR_RETURN", "LOSS", "DAMAGE"] as const;

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
	"Já esteve cadastrado em outra一门，据门口的 mimeType is Portuguese.",
	"Solicita aviso por telefone um dia antes.",
	"Conta com apoio da associação de bairro.",
	null,
];

const TITULO = /^(Sr|Sra|Srta|Srto|Dona|Dono)\.?\s+/i;

const WINDOW = {
	donation: { de: Date.UTC(2026, 0, 5), ate: Date.UTC(2026, 2, 31) },
	delivery: { de: Date.UTC(2026, 3, 5), ate: Date.UTC(2026, 5, 30) },
	count: { de: Date.UTC(2026, 6, 1), ate: Date.UTC(2026, 6, 20) },
	adjustment: { de: Date.UTC(2026, 6, 21), ate: Date.UTC(2026, 7, 20) },
} as const;

type Municipio = { cidade: string; uf: string };
type Catalog = { category: string; items: { name: string; unit: string }[] };

type AssistidoRow = z.infer<typeof assistidoSelectSchema>;
type DoadorRow = z.infer<typeof doadorSelectSchema>;
type ItemCategoryRow = z.infer<typeof itemCategorySelectSchema>;
type InventoryItemRow = z.infer<typeof inventoryItemSelectSchema>;
type DonationRow = z.infer<typeof donationSelectSchema>;
type DonationLineRow = z.infer<typeof donationLineSelectSchema>;
type DeliveryRow = z.infer<typeof deliverySelectSchema>;
type DeliveryLineRow = z.infer<typeof deliveryLineSelectSchema>;
type InventoryCountRow = z.infer<typeof inventoryCountSelectSchema>;
type InventoryCountLineRow = z.infer<typeof inventoryCountLineSelectSchema>;
type InventoryAdjustmentRow = z.infer<typeof inventoryAdjustmentSelectSchema>;

export type SeedData = {
	assistido: AssistidoRow[];
	doador: DoadorRow[];
	itemCategory: ItemCategoryRow[];
	inventoryItem: InventoryItemRow[];
	donation: DonationRow[];
	donationLine: DonationLineRow[];
	delivery: DeliveryRow[];
	deliveryLine: DeliveryLineRow[];
	inventoryCount: InventoryCountRow[];
	inventoryCountLine: InventoryCountLineRow[];
	inventoryAdjustment: InventoryAdjustmentRow[];
};

function lerJson<T>(arquivo: string): T {
	return JSON.parse(
		fs.readFileSync(path.join(BASE_DIR, arquivo), "utf-8"),
	) as T;
}

function validar<T>(schema: z.ZodType, tableName: string, row: unknown): T {
	const resultado = schema.safeParse(row);
	if (resultado.success) return resultado.data as T;

	const detail = resultado.error.issues
		.map((issue) => `${issue.path.join(".") || "(linha)"}: ${issue.message}`)
		.join("; ");

	throw new Error(`${tableName} gerada fora do schema — ${detail}`);
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
		complemento: faker.datatype.boolean()
			? faker.location.secondaryAddress()
			: null,
		bairro: faker.helpers.arrayElement(BAIRRO),
		cidade: municipio.cidade,
		uf: municipio.uf,
	};
}

function instant(janela: { de: number; ate: number }): Date {
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

		const row = {
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

		return validar(assistidoSelectSchema, "assistido", row);
	});
}

function criarDoadores(municipios: Municipio[]): DoadorRow[] {
	return Array.from({ length: ROWS_PER_TABLE.doador }, () => {
		const row = {
			id: fake(z.uuidv4()),
			nome: nomeDePessoa(),
			telefone: telefoneBrasileiro(),
			email: faker.internet.email(),
			...endereco(municipios),
		};

		return validar(doadorSelectSchema, "doador", row);
	});
}

function createCatalog(catalog: Catalog[]) {
	const categories: ItemCategoryRow[] = [];
	const items = new Map<string, InventoryItemRow>();

	for (const grupo of catalog) {
		const id = fake(z.uuidv4());
		categories.push(
			validar(itemCategorySelectSchema, "item_category", {
				id,
				name: grupo.category,
			}),
		);

		for (const item of grupo.items) {
			const itemId = fake(z.uuidv4());
			items.set(itemId, {
				id: itemId,
				name: item.name,
				categoryId: id,
				unit: item.unit as InventoryItemRow["unit"],
				onHand: 0,
				reservedQuantity: 0,
				available: 0,
			});
		}
	}

	return { categories, items };
}

type Estado = { onHand: number; reserved: number };

function available(estado: Estado): number {
	return estado.onHand - estado.reserved;
}

function pickItems<T>(items: Map<string, T>, quantity: number): T[] {
	const todos = [...items.values()];
	const escolhidos: T[] = [];
	const usados = new Set<T>();

	while (escolhidos.length < quantity && usados.size < todos.length) {
		const item = faker.helpers.arrayElement(todos);
		if (usados.has(item)) continue;
		usados.add(item);
		escolhidos.push(item);
	}

	return escolhidos;
}

function createDonations(
	doadores: DoadorRow[],
	items: Map<string, InventoryItemRow>,
	estado: Map<string, Estado>,
) {
	const donations: DonationRow[] = [];
	const donationLines: DonationLineRow[] = [];

	for (let i = 0; i < ROWS_PER_TABLE.donation; i += 1) {
		const id = fake(z.uuidv4());
		const donorId = faker.helpers.arrayElement(doadores).id;
		const status = faker.datatype.boolean(0.75) ? "RECEIVED" : "DRAFT";

		donations.push(
			validar(donationSelectSchema, "donation", {
				id,
				donorId,
				occurredAt: instant(WINDOW.donation),
				status,
				note: faker.datatype.boolean(0.3) ? "Doação de campanha" : null,
			}),
		);

		for (const item of pickItems(items, fake(z.int().min(1).max(3)))) {
			const quantity = fake(z.int().min(1).max(20));
			donationLines.push(
				validar(donationLineSelectSchema, "donation_line", {
					donationId: id,
					inventoryItemId: item.id,
					quantity,
				}),
			);

			if (status === "RECEIVED") {
				estado.get(item.id)!.onHand += quantity;
			}
		}
	}

	return { donations, donationLines };
}

function withAvailability(
	items: Map<string, InventoryItemRow>,
	estado: Map<string, Estado>,
) {
	return new Map(
		[...items.entries()].filter(([id]) => available(estado.get(id)!) > 0),
	);
}

function createDeliveries(
	beneficiaries: AssistidoRow[],
	items: Map<string, InventoryItemRow>,
	estado: Map<string, Estado>,
) {
	const deliveries: DeliveryRow[] = [];
	const deliveryLines: DeliveryLineRow[] = [];

	for (let i = 0; i < ROWS_PER_TABLE.delivery; i += 1) {
		const roll = faker.number.float({ min: 0, max: 1 });
		const status = roll < 0.3 ? "OPEN" : roll < 0.7 ? "COMPLETED" : "CANCELLED";
		const id = fake(z.uuidv4());

		const availableItems = withAvailability(items, estado);
		const rows = [];
		for (const item of pickItems(availableItems, fake(z.int().min(1).max(3)))) {
			const quantity = Math.min(
				fake(z.int().min(1).max(20)),
				available(estado.get(item.id)!),
			);
			if (quantity < 1) continue;
			rows.push({ item, quantity });
		}

		if (rows.length === 0) continue;

		deliveries.push(
			validar(deliverySelectSchema, "delivery", {
				id,
				beneficiaryId: faker.helpers.arrayElement(beneficiaries).id,
				occurredAt: instant(WINDOW.delivery),
				status,
				note: faker.datatype.boolean(0.25) ? "Entrega programada" : null,
			}),
		);

		for (const { item, quantity } of rows) {
			deliveryLines.push(
				validar(deliveryLineSelectSchema, "delivery_line", {
					deliveryId: id,
					inventoryItemId: item.id,
					quantity,
				}),
			);

			const atual = estado.get(item.id)!;
			if (status === "OPEN") {
				atual.reserved += quantity;
			} else if (status === "COMPLETED") {
				atual.onHand -= quantity;
			}
		}
	}

	return { deliveries, deliveryLines };
}

function createCounts(
	items: Map<string, InventoryItemRow>,
	estado: Map<string, Estado>,
) {
	const counts: InventoryCountRow[] = [];
	const countLines: InventoryCountLineRow[] = [];
	const adjustments: InventoryAdjustmentRow[] = [];

	for (let i = 0; i < ROWS_PER_TABLE.inventoryCount; i += 1) {
		const id = fake(z.uuidv4());
		const occurredAt = instant(WINDOW.count);

		counts.push(
			validar(inventoryCountSelectSchema, "inventory_count", {
				id,
				occurredAt,
				countedBy: "seed",
				note: `Contagem ${i + 1}`,
			}),
		);

		for (const item of pickItems(items, 6)) {
			const atual = estado.get(item.id)!;
			const counted = Math.max(
				atual.reserved,
				atual.onHand + fake(z.int().min(-4).max(4)),
			);

			countLines.push(
				validar(inventoryCountLineSelectSchema, "inventory_count_line", {
					countId: id,
					inventoryItemId: item.id,
					countedQuantity: counted,
				}),
			);

			adjustments.push(
				validar(inventoryAdjustmentSelectSchema, "inventory_adjustment", {
					id: fake(z.uuidv4()),
					inventoryItemId: item.id,
					delta: counted - atual.onHand,
					reason: "STOCKTAKE",
					occurredAt,
					countId: id,
				}),
			);

			atual.onHand = counted;
		}
	}

	return { counts, countLines, adjustments };
}

function createAdjustments(
	items: Map<string, InventoryItemRow>,
	estado: Map<string, Estado>,
): InventoryAdjustmentRow[] {
	const adjustments: InventoryAdjustmentRow[] = [];

	for (let i = 0; i < ROWS_PER_TABLE.adjustment; i += 1) {
		const item = faker.helpers.arrayElement([...items.values()]);
		const atual = estado.get(item.id)!;
		const delta = -fake(z.int().min(1).max(3));
		if (atual.onHand + delta < 0) continue;

		adjustments.push(
			validar(inventoryAdjustmentSelectSchema, "inventory_adjustment", {
				id: fake(z.uuidv4()),
				inventoryItemId: item.id,
				delta,
				reason: fake(z.enum(ADJUSTMENT_REASONS)),
				occurredAt: instant(WINDOW.adjustment),
				countId: null,
			}),
		);

		atual.onHand += delta;
	}

	return adjustments;
}

function conferirInvariantes(
	items: Map<string, InventoryItemRow>,
	estado: Map<string, Estado>,
) {
	for (const [id, item] of items) {
		const atual = estado.get(id)!;
		if (atual.reserved < 0 || atual.onHand < atual.reserved) {
			throw new Error(
				`inventory_item ${id} (${item.name}) ficou com on_hand=${atual.onHand} e reserved_quantity=${atual.reserved}`,
			);
		}
	}
}

export function gerarSeed(): SeedData {
	const municipios = lerJson<Municipio[]>("municipios.json");
	const catalog = lerJson<Catalog[]>("catalogo.json");
	const { categories, items } = createCatalog(catalog);

	const estado = new Map<string, Estado>();
	for (const id of items.keys()) {
		estado.set(id, { onHand: 0, reserved: 0 });
	}

	const assistidos = criarAssistidos(municipios);
	const doadores = criarDoadores(municipios);
	const { donations, donationLines } = createDonations(doadores, items, estado);
	const { deliveries, deliveryLines } = createDeliveries(
		assistidos,
		items,
		estado,
	);
	const {
		counts,
		countLines,
		adjustments: stocktakeAdjustments,
	} = createCounts(items, estado);
	const otherAdjustments = createAdjustments(items, estado);

	for (const [id, item] of items) {
		const atual = estado.get(id)!;
		item.onHand = atual.onHand;
		item.reservedQuantity = atual.reserved;
		item.available = atual.onHand - atual.reserved;
	}

	const inventoryItems = [...items.values()].map((item) =>
		validar<InventoryItemRow>(
			inventoryItemSelectSchema,
			"inventory_item",
			item,
		),
	);

	conferirInvariantes(items, estado);

	const total = inventoryItems.reduce((soma, i) => soma + i.onHand, 0);
	const reserved = inventoryItems.reduce((s, i) => s + i.reservedQuantity, 0);
	console.log(
		`  estoque: ${total} unidades em ${inventoryItems.length} itens, ${reserved} reservadas`,
	);

	return {
		assistido: assistidos,
		doador: doadores,
		itemCategory: categories,
		inventoryItem: inventoryItems,
		donation: donations,
		donationLine: donationLines,
		delivery: deliveries,
		deliveryLine: deliveryLines,
		inventoryCount: counts,
		inventoryCountLine: countLines,
		inventoryAdjustment: [...stocktakeAdjustments, ...otherAdjustments],
	};
}
