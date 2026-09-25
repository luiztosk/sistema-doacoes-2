CREATE TABLE `assistido` (
	`id` text PRIMARY KEY,
	`nome` text NOT NULL,
	`telefone` text,
	`email` text,
	`cep` text,
	`logradouro` text,
	`numero` text,
	`complemento` text,
	`bairro` text,
	`cidade` text,
	`uf` text(2),
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
	`observacoes` text
);
--> statement-breakpoint
CREATE TABLE `categoria_item` (
	`id` text PRIMARY KEY,
	`nome` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `coleta` (
	`id` text PRIMARY KEY,
	`doador_id` text,
	`data_hora` integer,
	CONSTRAINT `fk_coleta_doador_id_doador_id_fk` FOREIGN KEY (`doador_id`) REFERENCES `doador`(`id`)
);
--> statement-breakpoint
CREATE TABLE `doador` (
	`id` text PRIMARY KEY,
	`nome` text NOT NULL,
	`telefone` text,
	`email` text,
	`cep` text,
	`logradouro` text,
	`numero` text,
	`complemento` text,
	`bairro` text,
	`cidade` text,
	`uf` text(2)
);
--> statement-breakpoint
CREATE TABLE `entrega` (
	`id` text PRIMARY KEY,
	`assistido_id` text,
	`data_hora` integer,
	CONSTRAINT `fk_entrega_assistido_id_assistido_id_fk` FOREIGN KEY (`assistido_id`) REFERENCES `assistido`(`id`)
);
--> statement-breakpoint
CREATE TABLE `item` (
	`id` text PRIMARY KEY,
	`nome_id` text NOT NULL,
	`status` text DEFAULT 'AGUARDA_COLETA' NOT NULL,
	`coleta_id` text,
	`entrega_id` text,
	`doador_id` text,
	`assistido_id` text,
	CONSTRAINT `fk_item_nome_id_nome_item_id_fk` FOREIGN KEY (`nome_id`) REFERENCES `nome_item`(`id`),
	CONSTRAINT `fk_item_coleta_id_coleta_id_fk` FOREIGN KEY (`coleta_id`) REFERENCES `coleta`(`id`),
	CONSTRAINT `fk_item_entrega_id_entrega_id_fk` FOREIGN KEY (`entrega_id`) REFERENCES `entrega`(`id`),
	CONSTRAINT `fk_item_doador_id_doador_id_fk` FOREIGN KEY (`doador_id`) REFERENCES `doador`(`id`),
	CONSTRAINT `fk_item_assistido_id_assistido_id_fk` FOREIGN KEY (`assistido_id`) REFERENCES `assistido`(`id`)
);
--> statement-breakpoint
CREATE TABLE `nome_item` (
	`id` text PRIMARY KEY,
	`categoria_id` text NOT NULL,
	`nome` text NOT NULL,
	CONSTRAINT `fk_nome_item_categoria_id_categoria_item_id_fk` FOREIGN KEY (`categoria_id`) REFERENCES `categoria_item`(`id`)
);
--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `invitation` (
	`id` text PRIMARY KEY,
	`organization_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`inviter_id` text NOT NULL,
	CONSTRAINT `fk_invitation_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_invitation_inviter_id_user_id_fk` FOREIGN KEY (`inviter_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `member` (
	`id` text PRIMARY KEY,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_member_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_member_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `organization` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`logo` text,
	`created_at` integer NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL UNIQUE,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`active_organization_id` text,
	CONSTRAINT `fk_session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`email` text NOT NULL UNIQUE,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `invitation_organizationId_idx` ON `invitation` (`organization_id`);--> statement-breakpoint
CREATE INDEX `invitation_email_idx` ON `invitation` (`email`);--> statement-breakpoint
CREATE INDEX `member_organizationId_idx` ON `member` (`organization_id`);--> statement-breakpoint
CREATE INDEX `member_userId_idx` ON `member` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `organization_slug_uidx` ON `organization` (`slug`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);