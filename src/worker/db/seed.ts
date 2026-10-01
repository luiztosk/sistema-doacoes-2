import { getPlatformProxy } from 'wrangler';
import { drizzle } from 'drizzle-orm/d1';
import { D1Database } from '@cloudflare/workers-types';
import { gerarSeed } from './generate';
import {
	assistido, doador, itemCategory, inventoryItem, donation, donationLine,
	delivery, deliveryLine, inventoryCount, inventoryCountLine, inventoryAdjustment,
} from './schema';

async function seed() {
    const dados = gerarSeed();

    // `available` é coluna gerada: o select schema a exige e o banco recusa
    // escrita nela, então a linha completa é validada e só o insert a dispensa.
    const semGeradas = (linha: Record<string, unknown>) => {
        const resto = { ...linha };
        delete resto.available;
        return resto;
    };

    const tabelas = [
        { nome: 'assistido', tabela: assistido, linhas: dados.assistido },
        { nome: 'doador', tabela: doador, linhas: dados.doador },
        { nome: 'item_category', tabela: itemCategory, linhas: dados.itemCategory },
        { nome: 'inventory_item', tabela: inventoryItem, linhas: dados.inventoryItem.map(semGeradas) },
        { nome: 'donation', tabela: donation, linhas: dados.donation },
        { nome: 'donation_line', tabela: donationLine, linhas: dados.donationLine },
        { nome: 'delivery', tabela: delivery, linhas: dados.delivery },
        { nome: 'delivery_line', tabela: deliveryLine, linhas: dados.deliveryLine },
        { nome: 'inventory_count', tabela: inventoryCount, linhas: dados.inventoryCount },
        { nome: 'inventory_count_line', tabela: inventoryCountLine, linhas: dados.inventoryCountLine },
        { nome: 'inventory_adjustment', tabela: inventoryAdjustment, linhas: dados.inventoryAdjustment },
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

seed().catch((error) => {
    console.error(error);
    process.exit(1);
});
