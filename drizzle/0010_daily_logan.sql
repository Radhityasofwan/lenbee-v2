ALTER TABLE `users` MODIFY COLUMN `role` enum('tutor','parent','super_admin') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `active_until` timestamp;