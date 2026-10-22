import { getPlatformProxy } from "wrangler";
import { drizzle } from "drizzle-orm/d1";
import { D1Database } from "@cloudflare/workers-types";
import { count, eq } from "drizzle-orm";
import { gerarSeed } from "./generate";
import { beneficiary, donor } from "../src/schemas/db/contacts";
import {
	category,
	item,
	donation,
	delivery,
	inventoryCount,
	inventoryAdjustment,
	ledger,
} from "../src/schemas/db/inventory";

/**
 * A guarda do estoque mora num trigger do D1, e o trigger lê o saldo do
 * item. Por isso o seed escreve os movimentos **na mesma ordem que a API**:
 * a entrada no ledger, e logo depois o saldo. O lote é transação contra
 * erro — se um movimento estourar o estoque, o lote inteiro volta e o seed
 * falha em vez de escrever um banco incoerente.
 */
const MOVIMENTOS_POR_LOTE = 25;

async function seed() {
	const dados = gerarSeed();

	const withoutGenerated = (row: Record<string, unknown>) => {
		const resto = { ...row };
		delete resto.available;
		return resto;
	};

	const { env, dispose } = await getPlatformProxy();
	const db = drizzle(env.prod_sistema_doacoes_2 as D1Database);

	/**
	 * O seed **não** aceita um banco com dados. Ele é determinístico — o
	 * mesmo `seed(42)` gera os mesmos ids — então rodar duas vezes sem
	 * recriar o banco bate no `UNIQUE` do primeiro insert, e a mensagem do
	 * SQLite (`UNIQUE constraint failed: beneficiary.id`) não diz o que
	 * fazer. Aqui ela diz.
	 */
	const [existente] = await db.select({ total: count() }).from(beneficiary);
	if (existente && existente.total > 0) {
		throw new Error(
			`o banco ja tem ${existente.total} beneficiario(s) — o seed nao aceita um banco com dados. ` +
				"Rode `bun run db-reset` para recriar o banco do zero.",
		);
	}

	console.log("Seeding database...");

	let total = 0;
	try {
		for (const row of dados.beneficiary) {
			await db.insert(beneficiary).values(row);
		}
		total += dados.beneficiary.length;
		console.log(`  beneficiary: ${dados.beneficiary.length} rows`);

		for (const row of dados.donor) {
			await db.insert(donor).values(row);
		}
		total += dados.donor.length;
		console.log(`  doador: ${dados.donor.length} rows`);

		for (const row of dados.itemCategory) {
			await db.insert(category).values(row);
		}
		total += dados.itemCategory.length;
		console.log(`  item_category: ${dados.itemCategory.length} rows`);

		for (const row of dados.inventoryItem) {
			await db.insert(item).values({
				...withoutGenerated(row),
				onHand: 0,
				reserved: 0,
			});
		}
		total += dados.inventoryItem.length;
		console.log(`  inventory_item: ${dados.inventoryItem.length} rows`);

		for (const row of dados.donation) {
			await db.insert(donation).values(row);
		}
		total += dados.donation.length;
		console.log(`  donation: ${dados.donation.length} rows`);

		for (const row of dados.delivery) {
			await db.insert(delivery).values(row);
		}
		total += dados.delivery.length;
		console.log(`  delivery: ${dados.delivery.length} rows`);

		for (const row of dados.inventoryCount) {
			await db.insert(inventoryCount).values(row);
		}
		total += dados.inventoryCount.length;
		console.log(`  inventory_count: ${dados.inventoryCount.length} rows`);

		for (const row of dados.inventoryAdjustment) {
			await db.insert(inventoryAdjustment).values(row);
		}
		total += dados.inventoryAdjustment.length;
		console.log(`  inventory_adjustment: ${dados.inventoryAdjustment.length} rows`);

		for (
			let inicio = 0;
			inicio < dados.ledger.length;
			inicio += MOVIMENTOS_POR_LOTE
		) {
			const lote = dados.ledger.slice(inicio, inicio + MOVIMENTOS_POR_LOTE);

			await db.batch(
				lote.flatMap((movimento) => [
					db.insert(ledger).values({
						id: movimento.id,
						itemId: movimento.itemId,
						kind: movimento.kind,
						onHandDelta: movimento.onHandDelta,
						reservedDelta: movimento.reservedDelta,
						countedQuantity: movimento.countedQuantity,
						refId: movimento.refId,
						occurredAt: movimento.occurredAt,
					}),
					db
						.update(item)
						.set({
							onHand: movimento.onHandAfter,
							reserved: movimento.reservedAfter,
						})
						.where(eq(item.id, movimento.itemId)),
				]),
			);
		}

		total += dados.ledger.length;
		console.log(`  ledger: ${dados.ledger.length} rows`);
	} finally {
		await dispose();
	}

	console.log(`Seeding complete! ${total} rows.`);
}

seed().catch((error) => {
	console.error(error);
	process.exit(1);
});
