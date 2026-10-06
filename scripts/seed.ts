import { getPlatformProxy } from "wrangler";
import { drizzle } from "drizzle-orm/d1";
import { D1Database } from "@cloudflare/workers-types";
import { gerarSeed } from "./generate";
import {
	beneficiary,
	donor,
} from "../src/schemas/db/contacts";
import {
	itemCategory,
	inventoryItem,
	donation,
	donationLine,
	delivery,
	deliveryLine,
	inventoryCount,
	inventoryCountLine,
	inventoryAdjustment,
} from "../src/schemas/db/inventory";

async function seed() {
	const dados = gerarSeed();

	const withoutGenerated = (row: Record<string, unknown>) => {
		const resto = { ...row };
		delete resto.available;
		return resto;
	};

	const tableNames = [
		{ name: "beneficiary", tableName: beneficiary, rows: dados.beneficiary },
		{ name: "doador", tableName: donor, rows: dados.donor },
		{ name: "item_category", tableName: itemCategory, rows: dados.itemCategory },
		{
			name: "inventory_item",
			tableName: inventoryItem,
			rows: dados.inventoryItem.map(withoutGenerated),
		},
		{ name: "donation", tableName: donation, rows: dados.donation },
		{ name: "donation_line", tableName: donationLine, rows: dados.donationLine },
		{ name: "delivery", tableName: delivery, rows: dados.delivery },
		{ name: "delivery_line", tableName: deliveryLine, rows: dados.deliveryLine },
		{
			name: "inventory_count",
			tableName: inventoryCount,
			rows: dados.inventoryCount,
		},
		{
			name: "inventory_count_line",
			tableName: inventoryCountLine,
			rows: dados.inventoryCountLine,
		},
		{
			name: "inventory_adjustment",
			tableName: inventoryAdjustment,
			rows: dados.inventoryAdjustment,
		},
	] as const;

	const { env, dispose } = await getPlatformProxy();
	const db = drizzle(env.prod_sistema_doacoes_2 as D1Database);

	console.log("Seeding database...");

	let total = 0;
	try {
		for (const { name, tableName, rows } of tableNames) {
			for (const row of rows) {
				await db.insert(tableName).values(row);
			}
			total += rows.length;
			console.log(`  ${name}: ${rows.length} rows`);
		}
	} finally {
		await dispose();
	}

	console.log(`Seeding complete! ${total} rows.`);
}

seed().catch((error) => {
	console.error(error);
	process.exit(1);
});
