CREATE TABLE `report_check_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`update_id` int NOT NULL,
	`label` varchar(160) NOT NULL,
	`checked` boolean NOT NULL DEFAULT false,
	`reason` enum('sudah_mampu','dengan_bantuan','perlu_dilatih'),
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `report_check_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `parent_updates` MODIFY COLUMN `kind` enum('weekly','monthly','brief','daily','custom') NOT NULL DEFAULT 'weekly';--> statement-breakpoint
ALTER TABLE `parent_updates` ADD `format` enum('narrative','checklist') DEFAULT 'narrative' NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `report_format` enum('narrative','checklist') DEFAULT 'narrative' NOT NULL;--> statement-breakpoint
ALTER TABLE `report_check_items` ADD CONSTRAINT `report_check_items_update_id_parent_updates_id_fk` FOREIGN KEY (`update_id`) REFERENCES `parent_updates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `report_check_items_update_idx` ON `report_check_items` (`update_id`);