CREATE UNIQUE INDEX `categoria_item_nome_uniq` ON `categoria_item` (lower("nome"));--> statement-breakpoint
CREATE UNIQUE INDEX `nome_item_nome_uniq` ON `nome_item` (lower("nome"));