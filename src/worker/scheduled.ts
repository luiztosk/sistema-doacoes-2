import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { reconciliation } from "../schemas/db/inventory";

type Drift = {
	item_id: string;
	ledger_on_hand: number;
	ledger_reserved: number;
	on_hand: number;
	reserved: number;
};

/**
 * A reconciliação confere o cache com o ledger, e prova que o estoque nunca
 * overcommitou — em nenhum momento da história, não só agora.
 *
 * Quando ela acha divergência, ela **avisa e segue**: a instituição não para
 * de entregar por causa de bookkeeping. O reparo é reconstruir o cache a
 * partir do ledger, que é seguro porque o cache é derivado.
 */
async function reconcile(env: Env) {
	const db = drizzle(env.prod_sistema_doacoes_2);

	const drifted = (await db.all(sql`
		select l.item_id,
		       sum(l.on_hand_delta) as ledger_on_hand,
		       sum(l.reserved_delta) as ledger_reserved,
		       i.on_hand,
		       i.reserved
		  from ledger l
		  join inventory_item i on i.id = l.item_id
		 group by l.item_id
		having sum(l.on_hand_delta) <> i.on_hand
		    or sum(l.reserved_delta) <> i.reserved
	`)) as Drift[];

	const [overcommitted] = (await db.all(sql`
		select count(*) as total
		  from (
			select sum(on_hand_delta) over w - sum(reserved_delta) over w as available
			  from ledger
			 window w as (partition by item_id order by seq)
		  )
		 where available < 0
	`)) as { total: number }[];

	const overcommittedCount = overcommitted?.total ?? 0;
	const ok = drifted.length === 0 && overcommittedCount === 0;

	const detail = JSON.stringify({
		drifted: drifted.map((row) => ({
			itemId: row.item_id,
			ledgerOnHand: row.ledger_on_hand,
			ledgerReserved: row.ledger_reserved,
			onHand: row.on_hand,
			reserved: row.reserved,
		})),
		overcommitted: overcommittedCount,
	});

	await db.insert(reconciliation).values({
		id: crypto.randomUUID(),
		runAt: new Date(),
		ok,
		driftedItems: drifted.length,
		detail,
	});

	if (!ok) {
		console.error("reconciliação achou divergência", detail);
	}

	return { ok, drifted: drifted.length, overcommitted: overcommittedCount };
}

export default {
	async scheduled(
		event: ScheduledEvent,
		env: Env,
		ctx: ExecutionContext,
	): Promise<void> {
		console.log("reconciliacao agendada", event.cron);
		ctx.waitUntil(reconcile(env));
	},
};
