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

function toColeta(row: any) {
    row.dataHora = row.dataHora ? new Date(row.dataHora) : null
    return row as InsertColeta
}

function toEntrega(row: any) {
    row.dataHora = row.dataHora ? new Date(row.dataHora) : null
    return row as InsertEntrega
}

async function seed() {
  const { env } = await getPlatformProxy();
  const db = drizzle(env.prod_sistema_doacoes_2 as D1Database);

  console.log('Seeding local database...');

  for (const a of organizations) await db.insert(organization).values(a);
  for (const a of assistidos) await db.insert(assistido).values(a)
  console.log(await db.select().from(assistido))
  for (const a of doadores) await db.insert(doador).values(a)
  for (const a of categorias) await db.insert(categoriaItem).values(a)
  for (const a of nomesItem) await db.insert(nomeItem).values(a)
  for (const a of coletas) await db.insert(coleta).values(toColeta(a))
  for (const a of entregas) await db.insert(entrega).values(toEntrega(a))
  for (const a of itens) await db.insert(item).values(a)

  console.log('Seeding complete!');
}

seed().catch(console.error);
