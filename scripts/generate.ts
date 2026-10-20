import fs from "fs";
import path from "path";
import { z } from "zod";
import { fake, getFaker, seed, setFaker } from "zod-schema-faker/v4";
import { faker as fakerPTBR } from "@faker-js/faker/locale/pt_BR";
import { UNITS } from "../src/schemas/api/enums";
import { beneficiarySchema } from "../src/schemas/api/beneficiary";
import { donorSchema } from "../src/schemas/api/donor";
import { categorySchema } from "../src/schemas/api/category";
import { itemSchema } from "../src/schemas/api/item";
import { donationListSchema } from "../src/schemas/api/donation";
import { deliveryListSchema } from "../src/schemas/api/delivery";
import { inventoryCountListSchema } from "../src/schemas/api/inventory-count";
import { inventoryAdjustmentListSchema } from "../src/schemas/api/inventory-adjustment";

setFaker(fakerPTBR);
seed(42);

const faker = getFaker();
const BASE_DIR = "mock_data";

const ROWS_PER_TABLE = {
	beneficiary: 100,
	donor: 25,
	donation: 45,
	delivery: 30,
	inventoryCount: 3,
	adjustment: 6,
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

type Unit = (typeof UNITS)[number];

type LedgerKind =
	| "COUNT"
	| "RECEIVE"
	| "RESERVE"
	| "ISSUE"
	| "RELEASE"
	| "ADJUST"
	| "REVERSE";

type BeneficiaryRow = z.infer<typeof beneficiarySchema>;
type DonorRow = z.infer<typeof donorSchema>;
type ItemCategoryRow = z.infer<typeof categorySchema>;
type InventoryItemRow = z.infer<typeof itemSchema>;
type DonationRow = z.infer<typeof donationListSchema> & { occurredAt: Date };
type DeliveryRow = z.infer<typeof deliveryListSchema> & { occurredAt: Date };
type InventoryCountRow = z.infer<typeof inventoryCountListSchema> & {
	occurredAt: Date;
};
type InventoryAdjustmentRow = z.infer<typeof inventoryAdjustmentListSchema> & {
	occurredAt: Date;
};
type LedgerRow = {
	id: string;
	itemId: string;
	kind: LedgerKind;
	onHandDelta: number;
	reservedDelta: number;
	countedQuantity: number | null;
	refId: string;
	occurredAt: Date;
	onHandAfter: number;
	reservedAfter: number;
};

type Catalog = { category: string; items: { name: string; unit: Unit }[] };

const catalogSchema: z.ZodType<Catalog[]> = z.array(
	z.object({
		category: z.string().min(1),
		items: z
			.array(z.object({ name: z.string().min(1), unit: z.enum(UNITS) }))
			.min(1),
	}),
);

export type SeedData = {
	beneficiary: BeneficiaryRow[];
	donor: DonorRow[];
	itemCategory: ItemCategoryRow[];
	inventoryItem: InventoryItemRow[];
	donation: DonationRow[];
	delivery: DeliveryRow[];
	inventoryCount: InventoryCountRow[];
	inventoryAdjustment: InventoryAdjustmentRow[];
	ledger: LedgerRow[];
};

function novoId(): string {
	return fake(z.uuidv4()).toLowerCase();
}

function lerJson<T>(arquivo: string): T {
	return JSON.parse(
		fs.readFileSync(path.join(BASE_DIR, arquivo), "utf-8"),
	) as T;
}

function lerCatalogo(): Catalog[] {
	const cru = lerJson<unknown>("catalogo.json");
	const resultado = catalogSchema.safeParse(cru);

	if (!resultado.success) {
		const detalhe = resultado.error.issues
			.map((issue) => `${issue.path.join(".") || "(item)"}: ${issue.message}`)
			.join("; ");
		throw new Error(`catalogo.json fora do formato — ${detalhe}`);
	}

	return resultado.data;
}

function conferir<T>(schema: z.ZodType, tableName: string, row: unknown): T {
	const resultado = schema.safeParse(row);

	if (!resultado.success) {
		const detail = resultado.error.issues
			.map((issue) => `${issue.path.join(".") || "(linha)"}: ${issue.message}`)
			.join("; ");
		throw new Error(`${tableName} gerada fora do schema — ${detail}`);
	}

	return row as T;
}

/**
 * O documento do banco guarda a data como `Date`, e o contrato fala ISO
 * 8601. A conferência roda no formato do contrato, e a linha que vai para o
 * banco continua com o `Date`.
 */
function conferirDocumento<T extends { occurredAt: Date }>(
	schema: z.ZodType,
	tableName: string,
	row: T,
): T {
	conferir(schema, tableName, {
		...row,
		occurredAt: row.occurredAt.toISOString(),
	});
	return row;
}

function nomeDePessoa(): string {
	return faker.person.fullName().replace(TITULO, "").trim();
}

function endereco(municipios: Municipio[]) {
	const municipio = faker.helpers.arrayElement(municipios);
	return {
		cep: faker.location.zipCode().replace("-", ""),
		logradouro: `${faker.helpers.arrayElement(TIPO_DE_LOGRADOURO)} ${faker.person.firstName()} ${faker.person.lastName()}`,
		numero: faker.location.buildingNumber(),
		complemento: faker.datatype.boolean()
			? faker.location.secondaryAddress()
			: "",
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

function criarBeneficiaries(municipios: Municipio[]): BeneficiaryRow[] {
	return Array.from({ length: ROWS_PER_TABLE.beneficiary }, () => {
		const aposentado = faker.datatype.boolean();
		const criancasPequenas = fake(z.int().min(0).max(4));
		const adolescentes = fake(z.int().min(0).max(3));
		const tipoImovel = fake(z.enum(["ALUGADO", "PROPRIO"]));

		const row = {
			id: novoId(),
			name: nomeDePessoa(),
			phone: faker.phone.number({ style: "international" }),
			email: faker.internet.email(),
			...endereco(municipios),
			tipoImovel,
			valorAluguel:
				tipoImovel === "ALUGADO" ? fake(z.int().min(200).max(3000)) : 0,
			estadoCivil: fake(
				z.enum([
					"SOLTEIRO",
					"CASADO",
					"DIVORCIADO",
					"VIUVO",
					"UNIAO_ESTAVEL",
				]),
			),
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

		return conferir(beneficiarySchema, "beneficiary", row);
	});
}

function criarDoadores(municipios: Municipio[]): DonorRow[] {
	return Array.from({ length: ROWS_PER_TABLE.donor }, () => {
		const row = {
			id: novoId(),
			name: nomeDePessoa(),
			phone: faker.phone.number({ style: "international" }),
			email: faker.internet.email(),
			...endereco(municipios),
		};

		return conferir(donorSchema, "donor", row);
	});
}

function createCatalog(catalog: Catalog[]) {
	const categories: ItemCategoryRow[] = [];
	const items = new Map<string, InventoryItemRow>();

	for (const grupo of catalog) {
		const id = novoId();
		categories.push(conferir(categorySchema, "item_category", { id, name: grupo.category }));

		for (const item of grupo.items) {
			const itemId = novoId();
			items.set(itemId, {
				id: itemId,
				name: item.name,
				categoryId: id,
				unit: item.unit,
				onHand: 0,
				reserved: 0,
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

/**
 * Um movimento, aplicado na simulação em memória. A simulação respeita a
 * mesma guarda que o trigger do D1: é ela que impede o seed de nascer com
 * estoque negativo ou overcommitado.
 */
function mover(
	ledger: LedgerRow[],
	estado: Map<string, Estado>,
	movimento: Omit<LedgerRow, "id">,
): LedgerRow {
	const atual = estado.get(movimento.itemId)!;
	const onHand = atual.onHand + movimento.onHandDelta;
	const reserved = atual.reserved + movimento.reservedDelta;

	if (onHand < 0 || reserved < 0 || onHand < reserved) {
		throw new Error(
			`movimento ${movimento.kind} deixaria o item ${movimento.itemId} com on_hand=${onHand} e reserved=${reserved}`,
		);
	}

	atual.onHand = onHand;
	atual.reserved = reserved;

	const entry: LedgerRow = {
		id: novoId(),
		...movimento,
		onHandAfter: onHand,
		reservedAfter: reserved,
	};
	ledger.push(entry);
	return entry;
}

function criarDoacoes(
	doadores: DonorRow[],
	items: Map<string, InventoryItemRow>,
	estado: Map<string, Estado>,
	ledger: LedgerRow[],
): DonationRow[] {
	const donations: DonationRow[] = [];

	for (let i = 0; i < ROWS_PER_TABLE.donation; i += 1) {
		const id = novoId();
		const donorId = faker.helpers.arrayElement(doadores).id;
		const status = faker.datatype.boolean(0.75) ? "RECEIVED" : "VOID";
		const occurredAt = instant(WINDOW.donation);

		const recebidas: LedgerRow[] = [];

		for (const item of pickItems(items, fake(z.int().min(1).max(3)))) {
			const quantity = fake(z.int().min(1).max(20));
			recebidas.push(
				mover(ledger, estado, {
					itemId: item.id,
					kind: "RECEIVE",
					onHandDelta: quantity,
					reservedDelta: 0,
					countedQuantity: null,
					refId: id,
					occurredAt,
				}),
			);
		}

		if (status === "VOID") {
			for (const recebida of recebidas) {
				mover(ledger, estado, {
					itemId: recebida.itemId,
					kind: "REVERSE",
					onHandDelta: -recebida.onHandDelta,
					reservedDelta: -recebida.reservedDelta,
					countedQuantity: null,
					refId: recebida.id,
					occurredAt,
				});
			}
		}

		donations.push(
			conferirDocumento(donationListSchema, "donation", {
				id,
				donorId,
				occurredAt,
				status,
				note: faker.datatype.boolean(0.3) ? "Doação de campanha" : null,
			}),
		);
	}

	return donations;
}

function withAvailability(
	items: Map<string, InventoryItemRow>,
	estado: Map<string, Estado>,
) {
	return new Map(
		[...items.entries()].filter(([id]) => available(estado.get(id)!) > 0),
	);
}

function criarEntregas(
	beneficiaries: BeneficiaryRow[],
	items: Map<string, InventoryItemRow>,
	estado: Map<string, Estado>,
	ledger: LedgerRow[],
): DeliveryRow[] {
	const deliveries: DeliveryRow[] = [];

	for (let i = 0; i < ROWS_PER_TABLE.delivery; i += 1) {
		const roll = faker.number.float({ min: 0, max: 1 });
		const status = roll < 0.3 ? "OPEN" : roll < 0.7 ? "COMPLETED" : "CANCELLED";
		const id = novoId();
		const occurredAt = instant(WINDOW.delivery);

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

		for (const { item, quantity } of rows) {
			mover(ledger, estado, {
				itemId: item.id,
				kind: "RESERVE",
				onHandDelta: 0,
				reservedDelta: quantity,
				countedQuantity: null,
				refId: id,
				occurredAt,
			});
		}

		if (status === "COMPLETED") {
			for (const { item, quantity } of rows) {
				mover(ledger, estado, {
					itemId: item.id,
					kind: "ISSUE",
					onHandDelta: -quantity,
					reservedDelta: -quantity,
					countedQuantity: null,
					refId: id,
					occurredAt,
				});
			}
		} else if (status === "CANCELLED") {
			for (const { item, quantity } of rows) {
				mover(ledger, estado, {
					itemId: item.id,
					kind: "RELEASE",
					onHandDelta: 0,
					reservedDelta: -quantity,
					countedQuantity: null,
					refId: id,
					occurredAt,
				});
			}
		}

		deliveries.push(
			conferirDocumento(deliveryListSchema, "delivery", {
				id,
				beneficiaryId: faker.helpers.arrayElement(beneficiaries).id,
				occurredAt,
				status,
				note: faker.datatype.boolean(0.25) ? "Entrega programada" : null,
			}),
		);
	}

	return deliveries;
}

function criarContagens(
	items: Map<string, InventoryItemRow>,
	estado: Map<string, Estado>,
	ledger: LedgerRow[],
): {
	counts: InventoryCountRow[];
	adjustments: InventoryAdjustmentRow[];
} {
	const counts: InventoryCountRow[] = [];
	const adjustments: InventoryAdjustmentRow[] = [];

	for (let i = 0; i < ROWS_PER_TABLE.inventoryCount; i += 1) {
		const id = novoId();
		const occurredAt = instant(WINDOW.count);

		counts.push(
			conferirDocumento(inventoryCountListSchema, "inventory_count", {
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
				atual.onHand + fake(z.int().min(0).max(12)),
			);
			const delta = counted - atual.onHand;

			mover(ledger, estado, {
				itemId: item.id,
				kind: "COUNT",
				onHandDelta: delta,
				reservedDelta: 0,
				countedQuantity: counted,
				refId: id,
				occurredAt,
			});

			adjustments.push(
				conferirDocumento(inventoryAdjustmentListSchema, "inventory_adjustment", {
					id: novoId(),
					itemId: item.id,
					delta,
					reason: "STOCKTAKE",
					occurredAt,
				}),
			);
		}
	}

	return { counts, adjustments };
}

function criarAjustes(
	items: Map<string, InventoryItemRow>,
	estado: Map<string, Estado>,
	ledger: LedgerRow[],
): InventoryAdjustmentRow[] {
	const adjustments: InventoryAdjustmentRow[] = [];

	for (let i = 0; i < ROWS_PER_TABLE.adjustment; i += 1) {
		const item = faker.helpers.arrayElement([...items.values()]);
		const atual = estado.get(item.id)!;
		const delta = -fake(z.int().min(1).max(3));
		const id = novoId();
		const occurredAt = instant(WINDOW.adjustment);

		if (atual.onHand + delta < atual.reserved) continue;

		mover(ledger, estado, {
			itemId: item.id,
			kind: "ADJUST",
			onHandDelta: delta,
			reservedDelta: 0,
			countedQuantity: null,
			refId: id,
			occurredAt,
		});

		adjustments.push(
			conferirDocumento(inventoryAdjustmentListSchema, "inventory_adjustment", {
				id,
				itemId: item.id,
				delta,
				reason: fake(z.enum(ADJUSTMENT_REASONS)),
				occurredAt,
			}),
		);
	}

	return adjustments;
}

/**
 * As duas invariantes, conferidas antes de o seed escrever: o cache bate com
 * o ledger, e o estoque nunca overcommitou — em nenhum momento da história.
 */
function conferirInvariantes(
	items: Map<string, InventoryItemRow>,
	estado: Map<string, Estado>,
	ledger: LedgerRow[],
) {
	for (const [id, item] of items) {
		const atual = estado.get(id)!;
		if (atual.reserved < 0 || atual.onHand < atual.reserved) {
			throw new Error(
				`inventory_item ${id} (${item.name}) ficou com on_hand=${atual.onHand} e reserved=${atual.reserved}`,
			);
		}
	}

	const porItem = new Map<string, { onHand: number; reserved: number }>();

	for (const entry of ledger) {
		const atual = porItem.get(entry.itemId) ?? { onHand: 0, reserved: 0 };
		atual.onHand += entry.onHandDelta;
		atual.reserved += entry.reservedDelta;
		if (atual.onHand - atual.reserved < 0) {
			throw new Error(
				`o estoque de ${entry.itemId} ficou negativo no movimento ${entry.kind}`,
			);
		}
		porItem.set(entry.itemId, atual);
	}
}

export function gerarSeed(): SeedData {
	const municipios = lerJson<Municipio[]>("municipios.json");
	const catalog = lerCatalogo();
	const { categories, items } = createCatalog(catalog);

	const estado = new Map<string, Estado>();
	for (const id of items.keys()) {
		estado.set(id, { onHand: 0, reserved: 0 });
	}

	const ledger: LedgerRow[] = [];

	const beneficiaries = criarBeneficiaries(municipios);
	const doadores = criarDoadores(municipios);
	const donations = criarDoacoes(doadores, items, estado, ledger);
	const deliveries = criarEntregas(beneficiaries, items, estado, ledger);
	const { counts, adjustments: stocktakeAdjustments } = criarContagens(
		items,
		estado,
		ledger,
	);
	const otherAdjustments = criarAjustes(items, estado, ledger);

	for (const [id, item] of items) {
		const atual = estado.get(id)!;
		item.onHand = atual.onHand;
		item.reserved = atual.reserved;
		item.available = atual.onHand - atual.reserved;
	}

	const inventoryItems = [...items.values()].map((item) =>
		conferir(itemSchema, "inventory_item", item),
	);

	conferirInvariantes(items, estado, ledger);

	const total = inventoryItems.reduce((soma, i) => soma + i.onHand, 0);
	const reserved = inventoryItems.reduce((s, i) => s + i.reserved, 0);
	console.log(
		`  estoque: ${total} unidades em ${inventoryItems.length} itens, ${reserved} reservadas`,
	);
	console.log(`  ledger: ${ledger.length} movimentos`);

	return {
		beneficiary: beneficiaries,
		donor: doadores,
		itemCategory: categories,
		inventoryItem: inventoryItems,
		donation: donations,
		delivery: deliveries,
		inventoryCount: counts,
		inventoryAdjustment: [...stocktakeAdjustments, ...otherAdjustments],
		ledger,
	};
}
