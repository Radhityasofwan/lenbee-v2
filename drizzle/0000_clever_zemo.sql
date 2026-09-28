CREATE TABLE `ai_generations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`kind` varchar(60) NOT NULL,
	`provider` varchar(60) NOT NULL,
	`model` varchar(120),
	`ok` boolean NOT NULL DEFAULT true,
	`error_message` text,
	`prompt_chars` int NOT NULL DEFAULT 0,
	`output_chars` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_generations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assignment_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignment_id` int NOT NULL,
	`student_id` int NOT NULL,
	`status` enum('in_progress','submitted','graded') NOT NULL DEFAULT 'in_progress',
	`score` int,
	`max_score` int NOT NULL DEFAULT 0,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`submitted_at` timestamp,
	`graded_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assignment_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`program_id` int,
	`title` varchar(200) NOT NULL,
	`material` varchar(200),
	`instructions` text,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'medium',
	`ai_generated` boolean NOT NULL DEFAULT false,
	`created_by_user_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attempt_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attempt_id` int NOT NULL,
	`question_id` int NOT NULL,
	`answer` text,
	`is_correct` boolean,
	`points_awarded` int NOT NULL DEFAULT 0,
	`feedback` text,
	CONSTRAINT `attempt_answers_id` PRIMARY KEY(`id`),
	CONSTRAINT `attempt_answers_uq` UNIQUE(`attempt_id`,`question_id`)
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` varchar(64) NOT NULL,
	`user_id` int NOT NULL,
	`expires_at` timestamp NOT NULL,
	`user_agent` varchar(500),
	`ip` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auth_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`student_id` int,
	`program_id` int,
	`lesson_id` int,
	`material_tag` varchar(160),
	`category` enum('worksheet','exercise','summary','material','school','other') NOT NULL DEFAULT 'other',
	`storage_key` varchar(500) NOT NULL,
	`original_name` varchar(255) NOT NULL,
	`mime_type` varchar(120) NOT NULL,
	`size` bigint NOT NULL,
	`uploaded_by_user_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoice_id` int NOT NULL,
	`lesson_id` int,
	`program_id` int,
	`description` varchar(255) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit_price` int NOT NULL DEFAULT 0,
	`amount` int NOT NULL DEFAULT 0,
	CONSTRAINT `invoice_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoice_number` varchar(40) NOT NULL,
	`student_id` int NOT NULL,
	`period_start` date NOT NULL,
	`period_end` date NOT NULL,
	`issue_date` date NOT NULL,
	`due_date` date,
	`status` enum('unpaid','partial','paid','void') NOT NULL DEFAULT 'unpaid',
	`subtotal` int NOT NULL DEFAULT 0,
	`discount` int NOT NULL DEFAULT 0,
	`total` int NOT NULL DEFAULT 0,
	`paid_amount` int NOT NULL DEFAULT 0,
	`paid_at` timestamp,
	`notes` text,
	`public_token` varchar(64) NOT NULL,
	`created_by_user_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_number_uq` UNIQUE(`invoice_number`),
	CONSTRAINT `invoices_token_uq` UNIQUE(`public_token`)
);
--> statement-breakpoint
CREATE TABLE `lesson_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lesson_id` int NOT NULL,
	`storage_key` varchar(500) NOT NULL,
	`original_name` varchar(255) NOT NULL,
	`mime_type` varchar(120) NOT NULL,
	`size` bigint NOT NULL,
	`kind` enum('image','document') NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lesson_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lesson_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`program_id` int NOT NULL,
	`schedule_id` int,
	`tutor_id` int NOT NULL,
	`date` date NOT NULL,
	`start_time` time NOT NULL,
	`end_time` time NOT NULL,
	`duration_minutes` int NOT NULL DEFAULT 60,
	`status` enum('scheduled','completed','cancelled','moved') NOT NULL DEFAULT 'scheduled',
	`attendance` enum('present','absent') NOT NULL DEFAULT 'present',
	`cancel_reason` enum('cancelled','student_absent','tutor_absent','holiday'),
	`is_billable` boolean NOT NULL DEFAULT true,
	`focus` enum('routine','review','exam_prep','homework','remedial','other') NOT NULL DEFAULT 'routine',
	`topic_label` varchar(160),
	`material` text,
	`activities` text,
	`ability_notes` text,
	`notes` text,
	`report_text` text,
	`report_status` enum('none','draft','final') NOT NULL DEFAULT 'none',
	`report_generated_by` enum('manual','ai'),
	`completed_at` timestamp,
	`invoice_id` int,
	`moved_from_id` int,
	`moved_to_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lesson_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `ls_schedule_slot_uq` UNIQUE(`schedule_id`,`date`,`start_time`)
);
--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`identifier` varchar(191) NOT NULL,
	`success` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `login_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` enum('lesson_today','report_pending','invoice_unpaid','assignment_submitted','info') NOT NULL DEFAULT 'info',
	`title` varchar(200) NOT NULL,
	`body` text,
	`link` varchar(300),
	`dedupe_key` varchar(191),
	`is_read` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `notifications_dedupe_uq` UNIQUE(`user_id`,`dedupe_key`)
);
--> statement-breakpoint
CREATE TABLE `parent_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`email` varchar(191) NOT NULL,
	`name` varchar(120) NOT NULL,
	`phone` varchar(32),
	`student_ids` json NOT NULL,
	`expires_at` timestamp NOT NULL,
	`accepted_at` timestamp,
	`created_by_user_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `parent_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `parent_invites_token_uq` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `parent_students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parent_user_id` int NOT NULL,
	`student_id` int NOT NULL,
	`relation` varchar(40) NOT NULL DEFAULT 'orang tua',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `parent_students_id` PRIMARY KEY(`id`),
	CONSTRAINT `parent_students_uq` UNIQUE(`parent_user_id`,`student_id`)
);
--> statement-breakpoint
CREATE TABLE `parent_updates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`period_start` date NOT NULL,
	`period_end` date NOT NULL,
	`body` text NOT NULL,
	`status` enum('draft','final','sent') NOT NULL DEFAULT 'draft',
	`ai_generated` boolean NOT NULL DEFAULT false,
	`sent_at` timestamp,
	`created_by_user_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `parent_updates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `programs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`subject` varchar(120),
	`color` varchar(20) NOT NULL DEFAULT 'sky',
	`rate` int NOT NULL DEFAULT 0,
	`rate_unit` enum('per_session','per_hour') NOT NULL DEFAULT 'per_session',
	`default_duration_minutes` int NOT NULL DEFAULT 60,
	`sessions_per_month` int,
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `progress_targets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`program_id` int,
	`title` varchar(200) NOT NULL,
	`description` text,
	`status` enum('pending','in_progress','mastered') NOT NULL DEFAULT 'pending',
	`order_index` int NOT NULL DEFAULT 0,
	`mastered_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `progress_targets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignment_id` int NOT NULL,
	`order_index` int NOT NULL DEFAULT 0,
	`type` enum('multiple_choice','short_answer','essay') NOT NULL,
	`prompt` text NOT NULL,
	`options` json,
	`correct_answer` text,
	`points` int NOT NULL DEFAULT 1,
	`explanation` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`program_id` int NOT NULL,
	`day_of_week` int NOT NULL,
	`start_time` time NOT NULL,
	`duration_minutes` int NOT NULL DEFAULT 60,
	`frequency` enum('weekly','biweekly') NOT NULL DEFAULT 'weekly',
	`start_date` date NOT NULL,
	`end_date` date,
	`location` varchar(160),
	`is_active` boolean NOT NULL DEFAULT true,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` varchar(120) NOT NULL,
	`value` text NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `skill_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`program_id` int,
	`skill` varchar(120) NOT NULL,
	`level` enum('needs_practice','developing','mastered') NOT NULL DEFAULT 'needs_practice',
	`note` text,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `skill_notes_id` PRIMARY KEY(`id`),
	CONSTRAINT `skill_notes_uq` UNIQUE(`student_id`,`skill`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`nickname` varchar(60),
	`birth_date` date,
	`school` varchar(160),
	`grade` varchar(60),
	`notes` text,
	`avatar_path` varchar(500),
	`color` varchar(20) NOT NULL DEFAULT 'violet',
	`is_active` boolean NOT NULL DEFAULT true,
	`parent_name` varchar(120),
	`parent_phone` varchar(32),
	`parent_email` varchar(191),
	`tutor_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `students_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(191) NOT NULL,
	`password_hash` varchar(255),
	`name` varchar(120) NOT NULL,
	`phone` varchar(32),
	`role` enum('tutor','parent') NOT NULL,
	`avatar_path` varchar(500),
	`is_active` boolean NOT NULL DEFAULT true,
	`last_login_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_uq` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `ai_generations` ADD CONSTRAINT `ai_generations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignment_attempts` ADD CONSTRAINT `assignment_attempts_assignment_id_assignments_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignment_attempts` ADD CONSTRAINT `assignment_attempts_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_program_id_programs_id_fk` FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attempt_answers` ADD CONSTRAINT `attempt_answers_attempt_id_assignment_attempts_id_fk` FOREIGN KEY (`attempt_id`) REFERENCES `assignment_attempts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attempt_answers` ADD CONSTRAINT `attempt_answers_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auth_sessions` ADD CONSTRAINT `auth_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_program_id_programs_id_fk` FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_lesson_id_lesson_sessions_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lesson_sessions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_uploaded_by_user_id_users_id_fk` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_lesson_id_lesson_sessions_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lesson_sessions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_program_id_programs_id_fk` FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_attachments` ADD CONSTRAINT `lesson_attachments_lesson_id_lesson_sessions_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lesson_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_sessions` ADD CONSTRAINT `lesson_sessions_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_sessions` ADD CONSTRAINT `lesson_sessions_program_id_programs_id_fk` FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_sessions` ADD CONSTRAINT `lesson_sessions_schedule_id_schedules_id_fk` FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_sessions` ADD CONSTRAINT `lesson_sessions_tutor_id_users_id_fk` FOREIGN KEY (`tutor_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_sessions` ADD CONSTRAINT `lesson_sessions_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_sessions` ADD CONSTRAINT `lesson_sessions_moved_from_id_lesson_sessions_id_fk` FOREIGN KEY (`moved_from_id`) REFERENCES `lesson_sessions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_sessions` ADD CONSTRAINT `lesson_sessions_moved_to_id_lesson_sessions_id_fk` FOREIGN KEY (`moved_to_id`) REFERENCES `lesson_sessions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parent_invites` ADD CONSTRAINT `parent_invites_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parent_students` ADD CONSTRAINT `parent_students_parent_user_id_users_id_fk` FOREIGN KEY (`parent_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parent_students` ADD CONSTRAINT `parent_students_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parent_updates` ADD CONSTRAINT `parent_updates_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parent_updates` ADD CONSTRAINT `parent_updates_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `programs` ADD CONSTRAINT `programs_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `progress_targets` ADD CONSTRAINT `progress_targets_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `progress_targets` ADD CONSTRAINT `progress_targets_program_id_programs_id_fk` FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_assignment_id_assignments_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `schedules` ADD CONSTRAINT `schedules_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `schedules` ADD CONSTRAINT `schedules_program_id_programs_id_fk` FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skill_notes` ADD CONSTRAINT `skill_notes_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skill_notes` ADD CONSTRAINT `skill_notes_program_id_programs_id_fk` FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_tutor_id_users_id_fk` FOREIGN KEY (`tutor_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ai_generations_user_idx` ON `ai_generations` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `attempts_assignment_idx` ON `assignment_attempts` (`assignment_id`);--> statement-breakpoint
CREATE INDEX `attempts_student_idx` ON `assignment_attempts` (`student_id`);--> statement-breakpoint
CREATE INDEX `assignments_student_idx` ON `assignments` (`student_id`);--> statement-breakpoint
CREATE INDEX `assignments_status_idx` ON `assignments` (`status`);--> statement-breakpoint
CREATE INDEX `attempt_answers_question_idx` ON `attempt_answers` (`question_id`);--> statement-breakpoint
CREATE INDEX `auth_sessions_user_idx` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `auth_sessions_exp_idx` ON `auth_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `documents_student_idx` ON `documents` (`student_id`);--> statement-breakpoint
CREATE INDEX `documents_program_idx` ON `documents` (`program_id`);--> statement-breakpoint
CREATE INDEX `documents_category_idx` ON `documents` (`category`);--> statement-breakpoint
CREATE INDEX `invoice_items_invoice_idx` ON `invoice_items` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `invoice_items_lesson_idx` ON `invoice_items` (`lesson_id`);--> statement-breakpoint
CREATE INDEX `invoices_student_idx` ON `invoices` (`student_id`);--> statement-breakpoint
CREATE INDEX `invoices_status_idx` ON `invoices` (`status`);--> statement-breakpoint
CREATE INDEX `lesson_attachments_lesson_idx` ON `lesson_attachments` (`lesson_id`);--> statement-breakpoint
CREATE INDEX `ls_student_date_idx` ON `lesson_sessions` (`student_id`,`date`);--> statement-breakpoint
CREATE INDEX `ls_tutor_date_idx` ON `lesson_sessions` (`tutor_id`,`date`);--> statement-breakpoint
CREATE INDEX `ls_status_idx` ON `lesson_sessions` (`status`);--> statement-breakpoint
CREATE INDEX `ls_invoice_idx` ON `lesson_sessions` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `ls_program_idx` ON `lesson_sessions` (`program_id`);--> statement-breakpoint
CREATE INDEX `login_attempts_ident_idx` ON `login_attempts` (`identifier`,`created_at`);--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`,`is_read`);--> statement-breakpoint
CREATE INDEX `parent_updates_student_idx` ON `parent_updates` (`student_id`);--> statement-breakpoint
CREATE INDEX `parent_updates_status_idx` ON `parent_updates` (`status`);--> statement-breakpoint
CREATE INDEX `programs_student_idx` ON `programs` (`student_id`);--> statement-breakpoint
CREATE INDEX `progress_targets_student_idx` ON `progress_targets` (`student_id`);--> statement-breakpoint
CREATE INDEX `questions_assignment_idx` ON `questions` (`assignment_id`);--> statement-breakpoint
CREATE INDEX `schedules_student_idx` ON `schedules` (`student_id`);--> statement-breakpoint
CREATE INDEX `schedules_program_idx` ON `schedules` (`program_id`);--> statement-breakpoint
CREATE INDEX `schedules_dow_idx` ON `schedules` (`day_of_week`);--> statement-breakpoint
CREATE INDEX `students_tutor_idx` ON `students` (`tutor_id`);--> statement-breakpoint
CREATE INDEX `students_name_idx` ON `students` (`name`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);