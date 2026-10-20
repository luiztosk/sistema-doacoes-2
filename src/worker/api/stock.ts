import { sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { LEDGER_KIND } from "../../schemas/api/enums";

export type LedgerKind = (typeof LEDGER_KIND)[number];

export type Movement = {
	itemId: string;
	kind: LedgerKind;
	onHandDelta: number;
	reservedDelta: number;
	countedQuantity?: number | null;
};

export type LedgerEntry = {
	id: string;
	item_id: string;
	kind: LedgerKind;
	on_hand_delta: number;
	reserved_delta: number;
	counted_quantity: number | null;
	ref_id: string;
	occurred_at: number;
};

/**
 * Toda operação de estoque é o mesmo par de statements dentro de um
 * `db.batch()`, e **a ordem é load-bearing**: a entrada no ledger vem
 * primeiro, porque é nela que mora a guarda (o trigger do D1); o saldo vem
 * depois, guardado pela existência da entrada.
 *
 * A variante com o mesmo guard nos dois statements perde a entrada do
 * ledger: o segundo lê o saldo já mutado, não casa, e o lote termina com o
 * cache movido e o ledger sem a linha.
 *
 * As entradas de um documento entram num statement só, via `json_each` — o
 * `WHERE true` é obrigatório, porque sem ele o parser do SQLite não
 * distingue o `ON` do join do `ON` do upsert e o statement nem compila.
 */
export function ledgerInsert(db: DrizzleD1Database, entries: LedgerEntry[]) {
	const payload = JSON.stringify(
		entries.map((entry) => ({
			id: entry.id,
			itemId: entry.item_id,
			kind: entry.kind,
			onHandDelta: entry.on_hand_delta,
			reservedDelta: entry.reserved_delta,
			countedQuantity: entry.counted_quantity,
			refId: entry.ref_id,
			occurredAt: entry.occurred_at,
		})),
	);

	return db.run(sql`
		insert into ledger (
			id,
			item_id,
			kind,
			on_hand_delta,
			reserved_delta,
			counted_quantity,
			ref_id,
			occurred_at
		)
		select
			json_extract(value, '$.id'),
			json_extract(value, '$.itemId'),
			json_extract(value, '$.kind'),
			json_extract(value, '$.onHandDelta'),
			json_extract(value, '$.reservedDelta'),
			json_extract(value, '$.countedQuantity'),
			json_extract(value, '$.refId'),
			json_extract(value, '$.occurredAt')
		from json_each(${payload})
		where true
	`);
}

export function balanceUpdate(
	db: DrizzleD1Database,
	entry: LedgerEntry,
) {
	return db.run(sql`
		update inventory_item
		   set on_hand = on_hand + ${entry.on_hand_delta},
		       reserved = reserved + ${entry.reserved_delta}
		 where id = ${entry.item_id}
		   and exists (select 1 from ledger where id = ${entry.id})
	`);
}

export function toEntries(
	movements: Movement[],
	refId: string,
	occurredAt: Date,
): LedgerEntry[] {
	const seconds = Math.floor(occurredAt.getTime() / 1000);

	return movements.map((movement) => ({
		id: crypto.randomUUID(),
		item_id: movement.itemId,
		kind: movement.kind,
		on_hand_delta: movement.onHandDelta,
		reserved_delta: movement.reservedDelta,
		counted_quantity: movement.countedQuantity ?? null,
		ref_id: refId,
		occurred_at: seconds,
	}));
}

export type D1Batch = Parameters<DrizzleD1Database["batch"]>[0];

/**
 * Os statements de uma operação: a entrada no ledger e a atualização do
 * cache, na ordem que a guarda exige. As entradas vêm todas primeiro, e
 * depois cada cache é guardado pela existência da sua entrada.
 *
 * O statement do documento entra no mesmo lote, antes de tudo — é o que faz
 * a operação ser atômica.
 */
export function stockBatch(
	db: DrizzleD1Database,
	entries: LedgerEntry[],
	documents: D1Batch[number][] = [],
): D1Batch {
	return [
		...documents,
		ledgerInsert(db, entries),
		...entries.map((entry) => balanceUpdate(db, entry)),
	] as unknown as D1Batch;
}

/**
 * O conteúdo de um documento: os itens que ele carrega, lidos do ledger pelo
 * `ref_id`. O `kind` importa — uma entrega concluída tem `RESERVE` **e**
 * `ISSUE`, e o que descreve o **conteúdo** é sempre o `RESERVE`.
 */
const CONTENT_COLUMN = {
	RECEIVE: "on_hand_delta",
	RESERVE: "reserved_delta",
} as const;

export async function documentItems(
	db: DrizzleD1Database,
	refId: string,
	kind: keyof typeof CONTENT_COLUMN,
): Promise<{ itemId: string; quantity: number }[]> {
	const rows = (await db.all(sql`
		select item_id, ${sql.raw(CONTENT_COLUMN[kind])} as quantity
		  from ledger
		 where ref_id = ${refId}
		   and kind = ${kind}
		 order by seq
	`)) as { item_id: string; quantity: number }[];

	return rows.map((row) => ({
		itemId: row.item_id,
		quantity: row.quantity,
	}));
}

/**
 * As entradas de um documento, para o estorno. O `REVERSE` referencia a
 * entrada que ele estorna, e os deltas são a negação exata dos dela — é o
 * que devolve o estoque ao estado anterior.
 */
export async function documentEntries(
	db: DrizzleD1Database,
	refId: string,
	kind: keyof typeof CONTENT_COLUMN,
): Promise<LedgerEntry[]> {
	const rows = (await db.all(sql`
		select id,
		       item_id,
		       kind,
		       on_hand_delta,
		       reserved_delta,
		       counted_quantity,
		       ref_id,
		       occurred_at
		  from ledger
		 where ref_id = ${refId}
		   and kind = ${kind}
		 order by seq
	`)) as LedgerEntry[];

	return rows;
}

/**
 * O estorno: uma entrada nova, com os deltas da negação exata da entrada
 * que ela estorna. O `ref_id` é o id da entrada estornada — é o que permite
 * reconstruir a história de um documento.
 */
export function reverseEntries(
	entries: LedgerEntry[],
	occurredAt: Date,
): LedgerEntry[] {
	const seconds = Math.floor(occurredAt.getTime() / 1000);

	return entries.map((entry) => ({
		id: crypto.randomUUID(),
		item_id: entry.item_id,
		kind: "REVERSE",
		on_hand_delta: -entry.on_hand_delta,
		reserved_delta: -entry.reserved_delta,
		counted_quantity: null,
		ref_id: entry.id,
		occurred_at: seconds,
	}));
}

/**
 * O saldo reconstruído a partir do ledger. É a verdade — o cache é o que a
 * reconciliação confere.
 */
export async function ledgerBalances(
	db: DrizzleD1Database,
	itemIds: string[],
): Promise<Map<string, { onHand: number; reserved: number }>> {
	if (itemIds.length === 0) return new Map();

	const ids = sql.join(
		itemIds.map((id) => sql`${id}`),
		sql`, `,
	);

	const rows = (await db.all(sql`
		select item_id,
		       sum(on_hand_delta) as on_hand,
		       sum(reserved_delta) as reserved
		  from ledger
		 where item_id in (${ids})
		 group by item_id
	`)) as { item_id: string; on_hand: number; reserved: number }[];

	const balances = new Map<
		string,
		{ onHand: number; reserved: number }
	>();

	for (const row of rows) {
		balances.set(String(row.item_id), {
			onHand: Number(row.on_hand ?? 0),
			reserved: Number(row.reserved ?? 0),
		});
	}

	return balances;
}
