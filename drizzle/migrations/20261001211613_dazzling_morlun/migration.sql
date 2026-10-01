CREATE TABLE `delivery` (
	`id` text PRIMARY KEY,
	`beneficiary_id` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`note` text,
	CONSTRAINT `fk_delivery_beneficiary_id_assistido_id_fk` FOREIGN KEY (`beneficiary_id`) REFERENCES `assistido`(`id`)
);
--> statement-breakpoint
CREATE TABLE `delivery_line` (
	`delivery_id` text NOT NULL,
	`inventory_item_id` text NOT NULL,
	`quantity` integer NOT NULL,
	CONSTRAINT `delivery_line_pk` PRIMARY KEY(`delivery_id`, `inventory_item_id`),
	CONSTRAINT `fk_delivery_line_delivery_id_delivery_id_fk` FOREIGN KEY (`delivery_id`) REFERENCES `delivery`(`id`),
	CONSTRAINT `fk_delivery_line_inventory_item_id_inventory_item_id_fk` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_item`(`id`)
);
--> statement-breakpoint
CREATE TABLE `donation` (
	`id` text PRIMARY KEY,
	`donor_id` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`note` text,
	CONSTRAINT `fk_donation_donor_id_doador_id_fk` FOREIGN KEY (`donor_id`) REFERENCES `doador`(`id`)
);
--> statement-breakpoint
CREATE TABLE `donation_line` (
	`donation_id` text NOT NULL,
	`inventory_item_id` text NOT NULL,
	`quantity` integer NOT NULL,
	CONSTRAINT `donation_line_pk` PRIMARY KEY(`donation_id`, `inventory_item_id`),
	CONSTRAINT `fk_donation_line_donation_id_donation_id_fk` FOREIGN KEY (`donation_id`) REFERENCES `donation`(`id`),
	CONSTRAINT `fk_donation_line_inventory_item_id_inventory_item_id_fk` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_item`(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_adjustment` (
	`id` text PRIMARY KEY,
	`inventory_item_id` text NOT NULL,
	`delta` integer NOT NULL,
	`reason` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`count_id` text,
	CONSTRAINT `fk_inventory_adjustment_inventory_item_id_inventory_item_id_fk` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_item`(`id`),
	CONSTRAINT `fk_inventory_adjustment_count_id_inventory_count_id_fk` FOREIGN KEY (`count_id`) REFERENCES `inventory_count`(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_count` (
	`id` text PRIMARY KEY,
	`occurred_at` integer NOT NULL,
	`counted_by` text,
	`note` text
);
--> statement-breakpoint
CREATE TABLE `inventory_count_line` (
	`count_id` text NOT NULL,
	`inventory_item_id` text NOT NULL,
	`counted_quantity` integer NOT NULL,
	CONSTRAINT `inventory_count_line_pk` PRIMARY KEY(`count_id`, `inventory_item_id`),
	CONSTRAINT `fk_inventory_count_line_count_id_inventory_count_id_fk` FOREIGN KEY (`count_id`) REFERENCES `inventory_count`(`id`),
	CONSTRAINT `fk_inventory_count_line_inventory_item_id_inventory_item_id_fk` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_item`(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_item` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`category_id` text NOT NULL,
	`unit` text NOT NULL,
	`on_hand` integer DEFAULT 0 NOT NULL,
	`reserved_quantity` integer DEFAULT 0 NOT NULL,
	`available` integer GENERATED ALWAYS AS ("on_hand" - "reserved_quantity") VIRTUAL,
	CONSTRAINT `fk_inventory_item_category_id_item_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `item_category`(`id`)
);
--> statement-breakpoint
CREATE TABLE `item_category` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `delivery_beneficiaryId_idx` ON `delivery` (`beneficiary_id`);--> statement-breakpoint
CREATE INDEX `delivery_status_idx` ON `delivery` (`status`);--> statement-breakpoint
CREATE INDEX `delivery_line_inventoryItemId_idx` ON `delivery_line` (`inventory_item_id`);--> statement-breakpoint
CREATE INDEX `donation_donorId_idx` ON `donation` (`donor_id`);--> statement-breakpoint
CREATE INDEX `donation_status_idx` ON `donation` (`status`);--> statement-breakpoint
CREATE INDEX `donation_line_inventoryItemId_idx` ON `donation_line` (`inventory_item_id`);--> statement-breakpoint
CREATE INDEX `inventory_adjustment_inventoryItemId_idx` ON `inventory_adjustment` (`inventory_item_id`);--> statement-breakpoint
CREATE INDEX `inventory_adjustment_countId_idx` ON `inventory_adjustment` (`count_id`);--> statement-breakpoint
CREATE INDEX `inventory_count_line_inventoryItemId_idx` ON `inventory_count_line` (`inventory_item_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_item_name_uniq` ON `inventory_item` (lower("name"));--> statement-breakpoint
CREATE INDEX `inventory_item_categoryId_idx` ON `inventory_item` (`category_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `item_category_name_uniq` ON `item_category` (lower("name"));