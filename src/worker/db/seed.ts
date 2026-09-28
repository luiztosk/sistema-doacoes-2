import fs from "node:fs";
import path from "node:path";
import type { D1Database } from "@cloudflare/workers-types";
import { parse } from "csv-parse/sync";
import { getTableName, type InferInsertModel } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { AnySQLiteTable } from "drizzle-orm/sqlite-core";
import { getPlatformProxy } from "wrangler";
import {
	assistido,
	categoriaItem,
	coleta,
	doador,
	entrega,
	item,
	nomeItem,
	organization,
} from "./schema";
import { castCsvValue } from "./seed-csv";

const tables = [
	organization,
	assistido,
	doador,
	categoriaItem,
	nomeItem,
	coleta,
	entrega,
	item,
];
const BASE_DIR = "mock_data";

async function readCSV<T extends AnySQLiteTable>(table: T): Promise<InferInsertModel<T>[]> {
	const filePath = path.join(BASE_DIR, `${getTableName(table)}.csv`);
	const fileContent = fs.readFileSync(filePath, "utf-8");
	return parse(fileContent, {
		columns: true,
		skip_empty_lines: true,
		cast: castCsvValue,
	}) as InferInsertModel<T>[];
}

async function seed() {
	const persistPath = process.env.WRANGLER_PLATFORM_PERSIST_PATH;
	const { env, dispose } = await getPlatformProxy({
		persist: persistPath ? { path: persistPath } : true,
	});
	const db = drizzle(env.prod_sistema_doacoes_2 as D1Database);

	try {
		console.log("Seeding database...");

		for (const table of tables) {
			for (const row of await readCSV(table)) {
				const inserted = await db
					.insert(table)
					.values(row)
					.onConflictDoNothing()
					.returning();

				if (inserted.length === 0) {
					console.warn(
						`Skipped conflicting ${getTableName(table)} row: ${JSON.stringify(row)}`,
					);
				}
			}
		}

		console.log("Seeding complete!");
	} finally {
		await dispose();
	}
}

await seed();
