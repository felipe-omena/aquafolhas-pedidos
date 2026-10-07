CREATE TABLE `catalog_products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`short_name` text NOT NULL,
	`category` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`unit` text NOT NULL,
	`price_cents` integer NOT NULL,
	`tone` text DEFAULT 'tone-forest' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_catalog_products_active_sort` ON `catalog_products` (`active`,`sort_order`);--> statement-breakpoint
PRAGMA optimize;
