CREATE TABLE `ai_chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`attachment_document_ids` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_chat_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tutor_id` int NOT NULL,
	`student_id` int,
	`title` varchar(200) NOT NULL DEFAULT 'Percakapan baru',
	`state` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_chat_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `ai_style_notes` text;--> statement-breakpoint
ALTER TABLE `ai_chat_messages` ADD CONSTRAINT `ai_chat_messages_session_id_ai_chat_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `ai_chat_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_chat_sessions` ADD CONSTRAINT `ai_chat_sessions_tutor_id_users_id_fk` FOREIGN KEY (`tutor_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_chat_sessions` ADD CONSTRAINT `ai_chat_sessions_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ai_chat_messages_session_idx` ON `ai_chat_messages` (`session_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ai_chat_sessions_tutor_idx` ON `ai_chat_sessions` (`tutor_id`,`updated_at`);