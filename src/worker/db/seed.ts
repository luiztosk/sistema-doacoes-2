import { getPlatformProxy } from 'wrangler';
import { drizzle } from 'drizzle-orm/d1';
import { D1Database } from '@cloudflare/workers-types';
import { gerarSeed } from './generate';
import { assistido, doador, categoriaItem, nomeItem, coleta, entrega, item } from './schema';

async function seed() {
    const dados = gerarSeed();

    const tabelas = [
        { nome: 'assistido', tabela: assistido, linhas: dados.assistido },
        { nome: 'doador', tabela: doador, linhas: dados.doador },
        { nome: 'categoria_item', tabela: categoriaItem, linhas: dados.categoriaItem },
        { nome: 'nome_item', tabela: nomeItem, linhas: dados.nomeItem },
        { nome: 'coleta', tabela: coleta, linhas: dados.coleta },
        { nome: 'entrega', tabela: entrega, linhas: dados.entrega },
        { nome: 'item', tabela: item, linhas: dados.item },
    ] as const;

    const { env, dispose } = await getPlatformProxy();
    const db = drizzle(env.prod_sistema_doacoes_2 as D1Database);

    console.log('Seeding database...');

    let total = 0;
    try {
        for (const { nome, tabela, linhas } of tabelas) {
            for (const linha of linhas) {
                await db.insert(tabela).values(linha);
            }
            total += linhas.length;
            console.log(`  ${nome}: ${linhas.length} rows`);
        }
    } finally {
        await dispose();
    }

    console.log(`Seeding complete! ${total} rows.`);
}

await seed().catch((error: unknown) => {
    console.error('Seeding failed:', error);
    process.exit(1);
});
