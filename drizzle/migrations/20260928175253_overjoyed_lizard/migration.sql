INSERT INTO `organization` (
	`id`, `name`, `slug`, `created_at`, `metadata`
) SELECT
	'org-1',
	'Organização migrada',
	'legacy-import-' || lower(hex(randomblob(8))),
	CAST(unixepoch('2026-08-10T00:00:00Z') * 1000 AS INTEGER),
	'{"source":"multi-tenant migration"}'
WHERE NOT EXISTS (SELECT 1 FROM `organization` WHERE `id` = 'org-1')
	AND (
		EXISTS (SELECT 1 FROM `assistido` LIMIT 1)
		OR EXISTS (SELECT 1 FROM `doador` LIMIT 1)
		OR EXISTS (SELECT 1 FROM `categoria_item` LIMIT 1)
		OR EXISTS (SELECT 1 FROM `nome_item` LIMIT 1)
		OR EXISTS (SELECT 1 FROM `coleta` LIMIT 1)
		OR EXISTS (SELECT 1 FROM `entrega` LIMIT 1)
		OR EXISTS (SELECT 1 FROM `item` LIMIT 1)
	);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_assistido` (
	`id` text PRIMARY KEY,
	`organization_id` text NOT NULL,
	`nome` text NOT NULL,
	`telefone` text,
	`email` text,
	`cep` text,
	`logradouro` text,
	`numero` text,
	`complemento` text,
	`bairro` text,
	`cidade` text,
	`uf` text,
	`tipo_imovel` text,
	`valor_aluguel` integer,
	`estado_civil` text,
	`numero_adultos` integer,
	`criancas_pequenas` integer,
	`adolescentes` integer,
	`doentes` integer,
	`bolsa_familia` integer,
	`aposentado` integer,
	`pensao` integer,
	`cesta_basica` integer,
	`atividade_remunerada` integer,
	`renda` real,
	`crianca_escola` integer,
	`observacoes` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE NO ACTION
);--> statement-breakpoint
CREATE TABLE `__new_doador` (
	`id` text PRIMARY KEY,
	`organization_id` text NOT NULL,
	`nome` text NOT NULL,
	`telefone` text,
	`email` text,
	`cep` text,
	`logradouro` text,
	`numero` text,
	`complemento` text,
	`bairro` text,
	`cidade` text,
	`uf` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE NO ACTION
);--> statement-breakpoint
CREATE TABLE `__new_categoria_item` (
	`id` text PRIMARY KEY,
	`organization_id` text NOT NULL,
	`nome` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE NO ACTION
);--> statement-breakpoint
CREATE TABLE `__new_nome_item` (
	`id` text PRIMARY KEY,
	`organization_id` text NOT NULL,
	`categoria_id` text NOT NULL,
	`nome` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE NO ACTION,
	FOREIGN KEY (`categoria_id`) REFERENCES `__new_categoria_item`(`id`) ON DELETE NO ACTION
);--> statement-breakpoint
CREATE TABLE `__new_coleta` (
	`id` text PRIMARY KEY,
	`organization_id` text NOT NULL,
	`doador_id` text NOT NULL,
	`data_hora` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE NO ACTION,
	FOREIGN KEY (`doador_id`) REFERENCES `__new_doador`(`id`) ON DELETE NO ACTION
);--> statement-breakpoint
CREATE TABLE `__new_entrega` (
	`id` text PRIMARY KEY,
	`organization_id` text NOT NULL,
	`assistido_id` text NOT NULL,
	`data_hora` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE NO ACTION,
	FOREIGN KEY (`assistido_id`) REFERENCES `__new_assistido`(`id`) ON DELETE NO ACTION
);--> statement-breakpoint
CREATE TABLE `__new_item` (
	`id` text PRIMARY KEY,
	`organization_id` text NOT NULL,
	`nome_id` text NOT NULL,
	`status` text DEFAULT 'AGUARDA_COLETA' NOT NULL,
	`coleta_id` text,
	`entrega_id` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE NO ACTION,
	FOREIGN KEY (`nome_id`) REFERENCES `__new_nome_item`(`id`) ON DELETE NO ACTION,
	FOREIGN KEY (`coleta_id`) REFERENCES `__new_coleta`(`id`) ON DELETE NO ACTION,
	FOREIGN KEY (`entrega_id`) REFERENCES `__new_entrega`(`id`) ON DELETE NO ACTION
);--> statement-breakpoint
INSERT INTO `__new_assistido` (
	`id`, `organization_id`, `nome`, `telefone`, `email`, `cep`, `logradouro`,
	`numero`, `complemento`, `bairro`, `cidade`, `uf`, `tipo_imovel`,
	`valor_aluguel`, `estado_civil`, `numero_adultos`, `criancas_pequenas`,
	`adolescentes`, `doentes`, `bolsa_familia`, `aposentado`, `pensao`,
	`cesta_basica`, `atividade_remunerada`, `renda`, `crianca_escola`,
	`observacoes`
) SELECT
	`id`, 'org-1', `nome`, `telefone`, `email`, `cep`, `logradouro`, `numero`,
	`complemento`, `bairro`, `cidade`, `uf`, `tipo_imovel`, `valor_aluguel`,
	`estado_civil`, `numero_adultos`, `criancas_pequenas`, `adolescentes`,
	`doentes`, `bolsa_familia`, `aposentado`, `pensao`, `cesta_basica`,
	`atividade_remunerada`, `renda`, `crianca_escola`, `observacoes`
FROM `assistido`;--> statement-breakpoint
INSERT INTO `__new_doador` (
	`id`, `organization_id`, `nome`, `telefone`, `email`, `cep`, `logradouro`,
	`numero`, `complemento`, `bairro`, `cidade`, `uf`
) SELECT
	`id`, 'org-1', `nome`, `telefone`, `email`, `cep`, `logradouro`, `numero`,
	`complemento`, `bairro`, `cidade`, `uf`
FROM `doador`;--> statement-breakpoint
INSERT INTO `__new_categoria_item` (`id`, `organization_id`, `nome`)
SELECT `id`, 'org-1', `nome` FROM `categoria_item`;--> statement-breakpoint
INSERT INTO `__new_nome_item` (`id`, `organization_id`, `categoria_id`, `nome`)
SELECT `id`, 'org-1', `categoria_id`, `nome` FROM `nome_item`;--> statement-breakpoint
INSERT INTO `__new_coleta` (`id`, `organization_id`, `doador_id`, `data_hora`)
SELECT `id`, 'org-1', `doador_id`, `data_hora` FROM `coleta`;--> statement-breakpoint
INSERT INTO `__new_entrega` (`id`, `organization_id`, `assistido_id`, `data_hora`)
SELECT `id`, 'org-1', `assistido_id`, `data_hora` FROM `entrega`;--> statement-breakpoint
INSERT INTO `__new_item` (
	`id`, `organization_id`, `nome_id`, `status`, `coleta_id`, `entrega_id`
) SELECT
	`id`, 'org-1', `nome_id`, `status`, `coleta_id`, `entrega_id`
FROM `item`;--> statement-breakpoint
DROP TABLE `item`;--> statement-breakpoint
DROP TABLE `nome_item`;--> statement-breakpoint
DROP TABLE `coleta`;--> statement-breakpoint
DROP TABLE `entrega`;--> statement-breakpoint
DROP TABLE `categoria_item`;--> statement-breakpoint
DROP TABLE `doador`;--> statement-breakpoint
DROP TABLE `assistido`;--> statement-breakpoint
ALTER TABLE `__new_assistido` RENAME TO `assistido`;--> statement-breakpoint
ALTER TABLE `__new_doador` RENAME TO `doador`;--> statement-breakpoint
ALTER TABLE `__new_categoria_item` RENAME TO `categoria_item`;--> statement-breakpoint
ALTER TABLE `__new_nome_item` RENAME TO `nome_item`;--> statement-breakpoint
ALTER TABLE `__new_coleta` RENAME TO `coleta`;--> statement-breakpoint
ALTER TABLE `__new_entrega` RENAME TO `entrega`;--> statement-breakpoint
ALTER TABLE `__new_item` RENAME TO `item`;--> statement-breakpoint
CREATE INDEX `assistido_organizationId_idx` ON `assistido` (`organization_id`);--> statement-breakpoint
CREATE INDEX `doador_organizationId_idx` ON `doador` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `categoria_item_nome_uniq`
	ON `categoria_item` (`organization_id`, lower(`nome`));--> statement-breakpoint
CREATE UNIQUE INDEX `nome_item_nome_uniq`
	ON `nome_item` (`organization_id`, lower(`nome`));--> statement-breakpoint
CREATE INDEX `nome_item_organizationCategoria_idx`
	ON `nome_item` (`organization_id`, `categoria_id`);--> statement-breakpoint
CREATE INDEX `coleta_organizationDoador_idx`
	ON `coleta` (`organization_id`, `doador_id`);--> statement-breakpoint
CREATE INDEX `entrega_organizationAssistido_idx`
	ON `entrega` (`organization_id`, `assistido_id`);--> statement-breakpoint
CREATE INDEX `item_organizationStatus_idx`
	ON `item` (`organization_id`, `status`);--> statement-breakpoint
CREATE INDEX `item_organizationColeta_idx`
	ON `item` (`organization_id`, `coleta_id`);--> statement-breakpoint
CREATE INDEX `item_organizationEntrega_idx`
	ON `item` (`organization_id`, `entrega_id`);--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_key_check;
