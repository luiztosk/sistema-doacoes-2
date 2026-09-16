import { drizzle } from 'drizzle-orm/d1';
import { getPlatformProxy } from 'wrangler';
import { D1Database } from '@cloudflare/workers-types';
import { assistido, doador, categoriaItem, nomeItem, coleta, entrega, item, InsertAssistido, InsertDoador, InsertCategoriaItem, InsertNomeItem, InsertItem, InsertColeta, InsertEntrega, InsertOrganization } from './schema';
import { organization } from './schema'
import assistidoData from '../../../mock_data/Assistido.json';
import doadorData from '../../../mock_data/Doador.json';
import categoriaItemData from '../../../mock_data/CategoriaItem.json';
import nomeItemData from '../../../mock_data/NomeItem.json';
import coletaData from '../../../mock_data/Coleta.json';
import entregaData from '../../../mock_data/Entrega.json';
import itemData from '../../../mock_data/Item.json';
import organizationData from '../../../mock_data/Organization.json';
// import { organization } from 'better-auth/plugins';

const organizations: InsertOrganization[] = organizationData as InsertOrganization[];
const assistidos: InsertAssistido[] = assistidoData as InsertAssistido[];
const doadores: InsertDoador[] = doadorData as InsertDoador[];
const categorias: InsertCategoriaItem[] = categoriaItemData as InsertCategoriaItem[];
const nomesItem: InsertNomeItem[] = nomeItemData as InsertNomeItem[];
const coletas = coletaData as any[];
const entregas = entregaData as any[];
const itens: InsertItem[] = itemData as InsertItem[];

function toDate(row: any) {
    row.dataHora = row.dataHora ? new Date(row.dataHora) : null
    return row
}
const toEntrega = (values: any[]) => values.map(row => toDate(row) as InsertEntrega)
const toColeta = (values: any[]) => values.map(row => toDate(row) as InsertColeta)

async function seed() {
    const { env, dispose } = await getPlatformProxy();
    const db = drizzle(env.prod_sistema_doacoes_2 as D1Database);
    console.log('Seeding database...');

    type insertTuple = [string, any[], any]
    const inserts: insertTuple[] = [
        ["organization", organizations, organization],
        ["assistido", assistidos, assistido],
        ["doador", doadores, doador],
        ["categoriaItem", categorias, categoriaItem],
        ["nomeItem", nomesItem, nomeItem],
        ["coletas", toColeta(coletas), coleta],
        ["entregas", toEntrega(entregas), entrega],
        ["itens", itens, item]
    ]

    async function insertValues([name, values, table]: insertTuple) {
        // insert one by one due to SQLite query limit
        for (const a of values) await db.insert(table).values(a).onConflictDoNothing();
        console.log('finish inserting into: ', name)
    }

    for (const insert of inserts) {
        await insertValues(insert)
    }
    console.log('Seeding complete!');
    await dispose()
}

await seed().catch(console.error);
