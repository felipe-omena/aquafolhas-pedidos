CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_protocol` text NOT NULL,
	`product_id` text NOT NULL,
	`product_name` text NOT NULL,
	`unit` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`subtotal_cents` integer NOT NULL,
	FOREIGN KEY (`order_protocol`) REFERENCES `orders`(`protocol`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_order_items_protocol` ON `order_items` (`order_protocol`);--> statement-breakpoint
CREATE TABLE `orders` (
	`protocol` text PRIMARY KEY NOT NULL,
	`customer_name` text NOT NULL,
	`phone` text NOT NULL,
	`delivery_method` text NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`payment_method` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`discount_cents` integer DEFAULT 0 NOT NULL,
	`total_cents` integer NOT NULL,
	`printed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_orders_created_at` ON `orders` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_orders_open_status` ON `orders` (`status`);