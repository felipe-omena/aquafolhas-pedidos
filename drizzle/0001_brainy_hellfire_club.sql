PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_orders` (
	`protocol` text PRIMARY KEY NOT NULL,
	`customer_name` text NOT NULL,
	`phone` text NOT NULL,
	`delivery_method` text NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`payment_method` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'preparing' NOT NULL,
	`discount_cents` integer DEFAULT 0 NOT NULL,
	`total_cents` integer NOT NULL,
	`printed_at` text,
	`whatsapp_status` text DEFAULT 'pending' NOT NULL,
	`whatsapp_last_error` text,
	`whatsapp_sent_at` text,
	`last_notified_status` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_orders`("protocol", "customer_name", "phone", "delivery_method", "address", "payment_method", "notes", "status", "discount_cents", "total_cents", "printed_at", "whatsapp_status", "whatsapp_last_error", "whatsapp_sent_at", "last_notified_status", "created_at") SELECT "protocol", "customer_name", "phone", "delivery_method", "address", "payment_method", "notes", "status", "discount_cents", "total_cents", "printed_at", 'pending', NULL, NULL, NULL, "created_at" FROM `orders`;--> statement-breakpoint
DROP TABLE `orders`;--> statement-breakpoint
ALTER TABLE `__new_orders` RENAME TO `orders`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_orders_created_at` ON `orders` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_orders_open_status` ON `orders` (`status`);
