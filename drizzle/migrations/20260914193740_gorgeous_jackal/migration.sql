CREATE TABLE `assistido` (
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
	`observacoes` text,
	CONSTRAINT `fk_assistido_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`)
);
--> statement-breakpoint
CREATE TABLE `categoria_item` (
	`id` text PRIMARY KEY,
	`organization_id` text NOT NULL,
	`nome` text NOT NULL,
	CONSTRAINT `fk_categoria_item_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`)
);
--> statement-breakpoint
CREATE TABLE `coleta` (
	`id` text PRIMARY KEY,
	`organization_id` text NOT NULL,
	`doador_id` text,
	`data_hora` integer,
	CONSTRAINT `fk_coleta_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`),
	CONSTRAINT `fk_coleta_doador_id_doador_id_fk` FOREIGN KEY (`doador_id`) REFERENCES `doador`(`id`)
);
--> statement-breakpoint
CREATE TABLE `doador` (
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
	`uf` text(2),
	CONSTRAINT `fk_doador_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`)
);
--> statement-breakpoint
CREATE TABLE `entrega` (
	`id` text PRIMARY KEY,
	`organization_id` text NOT NULL,
	`assistido_id` text,
	`data_hora` integer,
	CONSTRAINT `fk_entrega_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`),
	CONSTRAINT `fk_entrega_assistido_id_assistido_id_fk` FOREIGN KEY (`assistido_id`) REFERENCES `assistido`(`id`)
);
--> statement-breakpoint
CREATE TABLE `item` (
	`id` text PRIMARY KEY,
	`organization_id` text NOT NULL,
	`nome_id` text NOT NULL,
	`status` text DEFAULT 'AGUARDA_COLETA' NOT NULL,
	`coleta_id` text,
	`entrega_id` text,
	`doador_id` text,
	`assistido_id` text,
	CONSTRAINT `fk_item_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`),
	CONSTRAINT `fk_item_nome_id_nome_item_id_fk` FOREIGN KEY (`nome_id`) REFERENCES `nome_item`(`id`),
	CONSTRAINT `fk_item_coleta_id_coleta_id_fk` FOREIGN KEY (`coleta_id`) REFERENCES `coleta`(`id`),
	CONSTRAINT `fk_item_entrega_id_entrega_id_fk` FOREIGN KEY (`entrega_id`) REFERENCES `entrega`(`id`),
	CONSTRAINT `fk_item_doador_id_doador_id_fk` FOREIGN KEY (`doador_id`) REFERENCES `doador`(`id`),
	CONSTRAINT `fk_item_assistido_id_assistido_id_fk` FOREIGN KEY (`assistido_id`) REFERENCES `assistido`(`id`)
);
--> statement-breakpoint
CREATE TABLE `nome_item` (
	`id` text PRIMARY KEY,
	`organization_id` text NOT NULL,
	`categoria_id` text NOT NULL,
	`nome` text NOT NULL,
	CONSTRAINT `fk_nome_item_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`),
	CONSTRAINT `fk_nome_item_categoria_id_categoria_item_id_fk` FOREIGN KEY (`categoria_id`) REFERENCES `categoria_item`(`id`)
);
