CREATE TABLE `beneficiary` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`cep` text,
	`logradouro` text,
	`numero` text,
	`complemento` text,
	`bairro` text,
	`cidade` text,
	`uf` text,
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
CREATE TABLE `donor` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`cep` text,
	`logradouro` text,
	`numero` text,
	`complemento` text,
	`bairro` text,
	`cidade` text,
	`uf` text
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_donation` (
	`id` text PRIMARY KEY,
	`donor_id` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`note` text,
	CONSTRAINT `fk_donation_donor_id_donor_id_fk` FOREIGN KEY (`donor_id`) REFERENCES `donor`(`id`)
);
--> statement-breakpoint
INSERT INTO `__new_donation`(`id`, `donor_id`, `occurred_at`, `status`, `note`) SELECT `id`, `donor_id`, `occurred_at`, `status`, `note` FROM `donation`;--> statement-breakpoint
DROP TABLE `donation`;--> statement-breakpoint
ALTER TABLE `__new_donation` RENAME TO `donation`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `delivery_beneficiaryId_idx` ON `delivery` (`beneficiary_id`);--> statement-breakpoint
CREATE INDEX `delivery_status_idx` ON `delivery` (`status`);--> statement-breakpoint
CREATE INDEX `donation_donorId_idx` ON `donation` (`donor_id`);--> statement-breakpoint
CREATE INDEX `donation_status_idx` ON `donation` (`status`);--> statement-breakpoint
DROP TABLE `assistido`;--> statement-breakpoint
DROP TABLE `doador`;