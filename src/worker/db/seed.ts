import fs from 'fs';
import path from 'path';
import { InfoField, parse } from 'csv-parse/sync';
import { drizzle } from 'drizzle-orm/d1';
import { getPlatformProxy } from 'wrangler';
import { D1Database } from '@cloudflare/workers-types';
import { assistido, doador, categoriaItem, nomeItem, coleta, entrega, item } from './schema';
// import { organization } from './schema'
import { getTableName, InferInsertModel } from 'drizzle-orm';
import { AnySQLiteTable } from 'drizzle-orm/sqlite-core';

const tables = [
        // organization,
        assistido,
        doador,
        categoriaItem,
        nomeItem,
        coleta,
        entrega,
        item,
]
const BASE_DIR = 'mock_data'

function csv_as_DateNull(value: string, context: InfoField) {
    if (value === '' && !context.quoting) 
        return null
    if (context.column === 'dataHora') 
        return new Date(value)
    return value
}

async function readCSV<T extends AnySQLiteTable>(table: T): Promise<InferInsertModel<T>[]> {
    const filePath = path.join(BASE_DIR, getTableName(table) + '.csv')
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        cast: csv_as_DateNull,
    }) as InferInsertModel<T>[];
    return records
}

async function seed() {
    const { env, dispose } = await getPlatformProxy();
    const db = drizzle(env.prod_sistema_doacoes_2 as D1Database);
    console.log('Seeding database...');

    for (const table of tables) {
        for (const row of await readCSV(table)) {
            await db.insert(table).values(row).onConflictDoNothing();
        } 
    }

    console.log('Seeding complete!');
    await dispose()
}

await seed().catch(console.error);
