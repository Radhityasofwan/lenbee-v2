CREATE TABLE `ai_api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alias` varchar(120) NOT NULL,
	`provider` enum('google','openrouter') NOT NULL,
	`api_key_encrypted` text NOT NULL,
	`key_hint` varchar(16),
	`base_url` varchar(300),
	`model_allowed` json,
	`priority` int NOT NULL DEFAULT 100,
	`is_active` boolean NOT NULL DEFAULT true,
	`health_status` enum('healthy','cooldown','disabled') NOT NULL DEFAULT 'healthy',
	`cooldown_until` timestamp,
	`last_health_check` timestamp,
	`last_error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_api_keys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_models` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('google','openrouter') NOT NULL,
	`model_id` varchar(191) NOT NULL,
	`name` varchar(200) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`synced_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_models_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_models_provider_model_uq` UNIQUE(`provider`,`model_id`)
);
--> statement-breakpoint
CREATE INDEX `ai_api_keys_route_idx` ON `ai_api_keys` (`provider`,`is_active`,`priority`);