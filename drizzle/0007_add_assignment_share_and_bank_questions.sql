CREATE TABLE `bank_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tutor_id` int NOT NULL,
	`subject` varchar(120) NOT NULL,
	`grade` varchar(60),
	`material` varchar(200) NOT NULL,
	`type` enum('multiple_choice','short_answer','essay') NOT NULL,
	`prompt` text NOT NULL,
	`options` json,
	`correct_answer` text,
	`points` int NOT NULL DEFAULT 1,
	`explanation` text,
	`difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'medium',
	`usage_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bank_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `assignments` ADD `public_token` varchar(64);--> statement-breakpoint
UPDATE `assignments` SET `public_token` = CONCAT(REPLACE(UUID(), '-', ''), SUBSTRING(SHA2(RAND(), 256), 1, 8)) WHERE `public_token` IS NULL;--> statement-breakpoint
ALTER TABLE `assignments` MODIFY COLUMN `public_token` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_token_uq` UNIQUE(`public_token`);--> statement-breakpoint
ALTER TABLE `bank_questions` ADD CONSTRAINT `bank_questions_tutor_id_users_id_fk` FOREIGN KEY (`tutor_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bank_questions_tutor_subject_idx` ON `bank_questions` (`tutor_id`,`subject`);--> statement-breakpoint
CREATE INDEX `bank_questions_tutor_material_idx` ON `bank_questions` (`tutor_id`,`material`);--> statement-breakpoint
CREATE INDEX `bank_questions_tutor_grade_idx` ON `bank_questions` (`tutor_id`,`grade`);