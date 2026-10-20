CREATE TABLE `ledger` (
	`seq` integer PRIMARY KEY AUTOINCREMENT,
	`id` text NOT NULL UNIQUE,
	`item_id` text NOT NULL,
	`kind` text NOT NULL,
	`on_hand_delta` integer DEFAULT 0 NOT NULL,
	`reserved_delta` integer DEFAULT 0 NOT NULL,
	`counted_quantity` integer,
	`ref_id` text NOT NULL,
	`occurred_at` integer NOT NULL,
	CONSTRAINT `fk_ledger_item_id_inventory_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `inventory_item`(`id`)
);
--> statement-breakpoint
CREATE TABLE `reconciliation` (
	`id` text PRIMARY KEY,
	`run_at` integer NOT NULL,
	`ok` integer NOT NULL,
	`drifted_items` integer DEFAULT 0 NOT NULL,
	`detail` text
);
--> statement-breakpoint
ALTER TABLE `inventory_item` ADD `reserved` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_item` DROP COLUMN `available`;--> statement-breakpoint
ALTER TABLE `inventory_item` ADD `available` integer GENERATED ALWAYS AS ("on_hand" - "reserved") VIRTUAL;--> statement-breakpoint
DROP TABLE `donation_line`;--> statement-breakpoint
DROP TABLE `delivery_line`;--> statement-breakpoint
DROP TABLE `inventory_count_line`;--> statement-breakpoint
ALTER TABLE `beneficiary` RENAME TO `__old_beneficiary`;--> statement-breakpoint
CREATE TABLE `beneficiary` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`cep` text,
	`logradouro` text,
	`numero` text,
	`complemento` text,
	`bairro` text NOT NULL,
	`cidade` text NOT NULL,
	`uf` text NOT NULL,
	`tipo_imovel` text,
	`valor_aluguel` real,
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
	`observacoes` text
);
--> statement-breakpoint
INSERT INTO `beneficiary`(`id`, `name`, `phone`, `email`, `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `uf`, `tipo_imovel`, `valor_aluguel`, `estado_civil`, `numero_adultos`, `criancas_pequenas`, `adolescentes`, `doentes`, `bolsa_familia`, `aposentado`, `pensao`, `cesta_basica`, `atividade_remunerada`, `renda`, `crianca_escola`, `observacoes`) SELECT `id`, `name`, `phone`, `email`, `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `uf`, `tipo_imovel`, `valor_aluguel`, `estado_civil`, `numero_adultos`, `criancas_pequenas`, `adolescentes`, `doentes`, `bolsa_familia`, `aposentado`, `pensao`, `cesta_basica`, `atividade_remunerada`, `renda`, `crianca_escola`, `observacoes` FROM `__old_beneficiary`;--> statement-breakpoint
CREATE TABLE `__new_delivery` (
	`id` text PRIMARY KEY,
	`beneficiary_id` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`note` text,
	CONSTRAINT `fk_delivery_beneficiary_id_beneficiary_id_fk` FOREIGN KEY (`beneficiary_id`) REFERENCES `beneficiary`(`id`)
);
--> statement-breakpoint
INSERT INTO `__new_delivery`(`id`, `beneficiary_id`, `occurred_at`, `status`, `note`) SELECT `id`, `beneficiary_id`, `occurred_at`, `status`, `note` FROM `delivery`;--> statement-breakpoint
DROP TABLE `delivery`;--> statement-breakpoint
ALTER TABLE `__new_delivery` RENAME TO `delivery`;--> statement-breakpoint
DROP TABLE `__old_beneficiary`;--> statement-breakpoint
ALTER TABLE `donor` RENAME TO `__old_donor`;--> statement-breakpoint
CREATE TABLE `donor` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`cep` text,
	`logradouro` text,
	`numero` text,
	`complemento` text,
	`bairro` text NOT NULL,
	`cidade` text NOT NULL,
	`uf` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `donor`(`id`, `name`, `phone`, `email`, `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `uf`) SELECT `id`, `name`, `phone`, `email`, `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `uf` FROM `__old_donor`;--> statement-breakpoint
CREATE TABLE `__new_donation` (
	`id` text PRIMARY KEY,
	`donor_id` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`status` text DEFAULT 'RECEIVED' NOT NULL,
	`note` text,
	CONSTRAINT `fk_donation_donor_id_donor_id_fk` FOREIGN KEY (`donor_id`) REFERENCES `donor`(`id`)
);
--> statement-breakpoint
INSERT INTO `__new_donation`(`id`, `donor_id`, `occurred_at`, `status`, `note`) SELECT `id`, `donor_id`, `occurred_at`, `status`, `note` FROM `donation`;--> statement-breakpoint
DROP TABLE `donation`;--> statement-breakpoint
ALTER TABLE `__new_donation` RENAME TO `donation`;--> statement-breakpoint
DROP TABLE `__old_donor`;--> statement-breakpoint
UPDATE `donation` SET `status` = 'RECEIVED' WHERE `status` = 'DRAFT';--> statement-breakpoint
CREATE INDEX `delivery_beneficiaryId_idx` ON `delivery` (`beneficiary_id`);--> statement-breakpoint
CREATE INDEX `delivery_status_idx` ON `delivery` (`status`);--> statement-breakpoint
CREATE INDEX `donation_donorId_idx` ON `donation` (`donor_id`);--> statement-breakpoint
CREATE INDEX `donation_status_idx` ON `donation` (`status`);--> statement-breakpoint
CREATE INDEX `inventory_adjustment_itemId_idx` ON `inventory_adjustment` (`inventory_item_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_kind_ref_item_uniq` ON `ledger` (`kind`,`ref_id`,`item_id`);--> statement-breakpoint
CREATE INDEX `ledger_ref_idx` ON `ledger` (`ref_id`,`kind`,`item_id`);--> statement-breakpoint
CREATE INDEX `ledger_item_idx` ON `ledger` (`item_id`,`seq`);--> statement-breakpoint
ALTER TABLE `inventory_item` DROP COLUMN `reserved_quantity`;--> statement-breakpoint
CREATE TRIGGER `ledger_guard` BEFORE INSERT ON `ledger`
BEGIN
  SELECT RAISE(ABORT, 'INSUFFICIENT_STOCK')
   WHERE NEW.kind = 'RESERVE'
     AND (SELECT `on_hand` - `reserved` FROM `inventory_item` WHERE `id` = NEW.`item_id`)
         < NEW.`reserved_delta`;

  SELECT RAISE(ABORT, 'INSUFFICIENT_STOCK')
   WHERE NEW.kind = 'ISSUE'
     AND (SELECT `on_hand` FROM `inventory_item` WHERE `id` = NEW.`item_id`)
         < -NEW.`on_hand_delta`;

  SELECT RAISE(ABORT, 'INVALID_RELEASE')
   WHERE NEW.kind = 'RELEASE'
     AND (SELECT `reserved` FROM `inventory_item` WHERE `id` = NEW.`item_id`)
         < -NEW.`reserved_delta`;

  SELECT RAISE(ABORT, 'NEGATIVE_STOCK')
   WHERE NEW.kind IN ('ADJUST', 'COUNT', 'REVERSE')
     AND (SELECT `on_hand` FROM `inventory_item` WHERE `id` = NEW.`item_id`) + NEW.`on_hand_delta`
         < (SELECT `reserved` FROM `inventory_item` WHERE `id` = NEW.`item_id`) + NEW.`reserved_delta`;
END;
