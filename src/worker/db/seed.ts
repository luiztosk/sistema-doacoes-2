import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';
import { getPlatformProxy } from 'wrangler';
import { D1Database } from '@cloudflare/workers-types';
import { assistido, doador, categoriaItem, nomeItem, coleta, entrega, item } from './schema';
import { organization } from './schema'
import { getTableName, InferInsertModel } from 'drizzle-orm';
import { AnySQLiteTable } from 'drizzle-orm/sqlite-core';

const tables = [
        organization,
        assistido,
        doador,
        categoriaItem,
        nomeItem,
        coleta,
        entrega,
        item,
]

async function insertValues<T extends AnySQLiteTable>(table: T, db: DrizzleD1Database){
    const filePath = path.join('mock_data', getTableName(table) + '.csv')
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        cast: (value, context) => {
            if (value === '' && !context.quoting) {
                return null
            }
            if (context.column === 'dataHora') {
                return new Date(value)
            }
            return value
        }
    }) as InferInsertModel<T>[];

    for (const row of records) {
        await db.insert(table).values(row).onConflictDoNothing();
    } 
}
async function seed() {
    const { env, dispose } = await getPlatformProxy();
    const db = drizzle(env.prod_sistema_doacoes_2 as D1Database);
    console.log('Seeding database...');

    for (const table of tables) {
        await insertValues(table, db)
    }

    console.log('Seeding complete!');
    await dispose()
}

await seed().catch(console.error);
