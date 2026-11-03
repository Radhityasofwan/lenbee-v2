CREATE TABLE `app_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`message` text NOT NULL,
	`status` enum('new','reviewed') NOT NULL DEFAULT 'new',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `app_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `app_feedback` ADD CONSTRAINT `app_feedback_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `app_feedback_status_idx` ON `app_feedback` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `app_feedback_user_idx` ON `app_feedback` (`user_id`);