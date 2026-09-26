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
	CONSTRAINT "assistido_nome_nao_vazio" CHECK(length(trim("nome")) > 0),
	CONSTRAINT "assistido_cep_formato" CHECK("cep" IS NULL OR (length("cep") = 8 AND "cep" NOT GLOB '*[^0-9]*')),
	CONSTRAINT "assistido_uf_valida" CHECK("uf" IS NULL OR "uf" IN ('AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO')),
	CONSTRAINT "assistido_tipo_imovel_valido" CHECK("tipo_imovel" IS NULL OR "tipo_imovel" IN ('ALUGADO', 'PROPRIO')),
	CONSTRAINT "assistido_valor_aluguel_compatipo_imovel" CHECK("tipo_imovel" IS NULL OR ("tipo_imovel" = 'PROPRIO' AND "valor_aluguel" IS NULL) OR ("tipo_imovel" = 'ALUGADO' AND "valor_aluguel" > 0)),
	CONSTRAINT "assistido_estado_civil_valido" CHECK("estado_civil" IS NULL OR "estado_civil" IN ('SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL')),
	CONSTRAINT "assistido_valor_aluguel_nao_negativo" CHECK("valor_aluguel" IS NULL OR "valor_aluguel" >= 0),
	CONSTRAINT "assistido_renda_nao_negativa" CHECK("renda" IS NULL OR "renda" >= 0),
	CONSTRAINT "assistido_numero_adultos_nao_negativo" CHECK("numero_adultos" IS NULL OR "numero_adultos" >= 0),
	CONSTRAINT "assistido_criancas_pequenas_nao_negativo" CHECK("criancas_pequenas" IS NULL OR "criancas_pequenas" >= 0),
	CONSTRAINT "assistido_adolescentes_nao_negativo" CHECK("adolescentes" IS NULL OR "adolescentes" >= 0),
	CONSTRAINT "assistido_doentes_valido" CHECK("doentes" IN (0, 1)),
	CONSTRAINT "assistido_bolsa_familia_valido" CHECK("bolsa_familia" IN (0, 1)),
	CONSTRAINT "assistido_aposentado_valido" CHECK("aposentado" IN (0, 1)),
	CONSTRAINT "assistido_pensao_valido" CHECK("pensao" IN (0, 1)),
	CONSTRAINT "assistido_cesta_basica_valido" CHECK("cesta_basica" IN (0, 1)),
	CONSTRAINT "assistido_atividade_remunerada_valido" CHECK("atividade_remunerada" IN (0, 1)),
	CONSTRAINT "assistido_crianca_escola_valido" CHECK("crianca_escola" IN (0, 1))
);
--> statement-breakpoint
CREATE TABLE `categoria_item` (
	`id` text PRIMARY KEY,
	`nome` text NOT NULL,
	CONSTRAINT "categoria_item_nome_nao_vazio" CHECK(length(trim("nome")) > 0)
);
--> statement-breakpoint
CREATE TABLE `coleta` (
	`id` text PRIMARY KEY,
	`doador_id` text NOT NULL,
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
	`uf` text,
	CONSTRAINT "doador_nome_nao_vazio" CHECK(length(trim("nome")) > 0),
	CONSTRAINT "doador_uf_valida" CHECK("uf" IS NULL OR "uf" IN ('AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO')),
	CONSTRAINT "doador_cep_formato" CHECK("cep" IS NULL OR (length("cep") = 8 AND "cep" NOT GLOB '*[^0-9]*'))
);
--> statement-breakpoint
CREATE TABLE `entrega` (
	`id` text PRIMARY KEY,
	`assistido_id` text NOT NULL,
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
	CONSTRAINT `fk_item_nome_id_nome_item_id_fk` FOREIGN KEY (`nome_id`) REFERENCES `nome_item`(`id`),
	CONSTRAINT `fk_item_coleta_id_coleta_id_fk` FOREIGN KEY (`coleta_id`) REFERENCES `coleta`(`id`),
	CONSTRAINT `fk_item_entrega_id_entrega_id_fk` FOREIGN KEY (`entrega_id`) REFERENCES `entrega`(`id`),
	CONSTRAINT "item_status_valido" CHECK("status" IN ('AGUARDA_COLETA', 'EM_ESTOQUE', 'ENTREGUE')),
	CONSTRAINT "item_entregue_exige_entrega" CHECK("status" <> 'ENTREGUE' OR "entrega_id" IS NOT NULL),
	CONSTRAINT "item_entrega_exige_coleta" CHECK("entrega_id" IS NULL OR "coleta_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE `nome_item` (
	`id` text PRIMARY KEY,
	`categoria_id` text NOT NULL,
	`nome` text NOT NULL,
	CONSTRAINT `fk_nome_item_categoria_id_categoria_item_id_fk` FOREIGN KEY (`categoria_id`) REFERENCES `categoria_item`(`id`),
	CONSTRAINT "nome_item_nome_nao_vazio" CHECK(length(trim("nome")) > 0)
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
CREATE INDEX `coleta_doadorId_idx` ON `coleta` (`doador_id`);--> statement-breakpoint
CREATE INDEX `entrega_assistidoId_idx` ON `entrega` (`assistido_id`);--> statement-breakpoint
CREATE INDEX `item_status_idx` ON `item` (`status`);--> statement-breakpoint
CREATE INDEX `item_coletaId_idx` ON `item` (`coleta_id`);--> statement-breakpoint
CREATE INDEX `item_entregaId_idx` ON `item` (`entrega_id`);--> statement-breakpoint
CREATE INDEX `nome_item_categoriaId_idx` ON `nome_item` (`categoria_id`);--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `invitation_organizationId_idx` ON `invitation` (`organization_id`);--> statement-breakpoint
CREATE INDEX `invitation_email_idx` ON `invitation` (`email`);--> statement-breakpoint
CREATE INDEX `member_organizationId_idx` ON `member` (`organization_id`);--> statement-breakpoint
CREATE INDEX `member_userId_idx` ON `member` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `organization_slug_uidx` ON `organization` (`slug`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);