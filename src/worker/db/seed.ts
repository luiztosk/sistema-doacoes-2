import { drizzle } from 'drizzle-orm/d1';
import { getPlatformProxy } from 'wrangler';
import { D1Database } from '@cloudflare/workers-types';
import { assistido, doador, categoriaItem, nomeItem, coleta, entrega, item, InsertAssistido, InsertDoador, InsertCategoriaItem, InsertNomeItem, InsertItem, InsertColeta, InsertEntrega } from './schema';
import assistidoData from '../../../mock_data/Assistido.json';
import doadorData from '../../../mock_data/Doador.json';
import categoriaItemData from '../../../mock_data/CategoriaItem.json';
import nomeItemData from '../../../mock_data/NomeItem.json';
import coletaData from '../../../mock_data/Coleta.json';
import entregaData from '../../../mock_data/Entrega.json';
import itemData from '../../../mock_data/Item.json';
import { organization } from 'better-auth/plugins';

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

  assistidos.forEach(async a => await db.insert(assistido).values(a))
  console.log(await db.select().from(assistido))
  doadores.forEach(async a => await db.insert(doador).values(a))
  categorias.forEach(async a => await db.insert(categoriaItem).values(a))
  nomesItem.forEach(async a => await db.insert(nomeItem).values(a))
  coletas.forEach(async a => await db.insert(coleta).values(toColeta(a)))
  entregas.forEach(async a => await db.insert(entrega).values(toEntrega(a)))
  itens.forEach(async a => await db.insert(item).values(a))

  console.log('Seeding complete!');
}

seed().catch(console.error);
