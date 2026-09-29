CREATE TABLE `whatsapp_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_protocol` text,
	`message_id` text,
	`direction` text NOT NULL,
	`message_kind` text NOT NULL,
	`order_status` text,
	`delivery_status` text DEFAULT 'pending' NOT NULL,
	`error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_protocol`) REFERENCES `orders`(`protocol`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_whatsapp_messages_order` ON `whatsapp_messages` (`order_protocol`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_whatsapp_messages_message_id` ON `whatsapp_messages` (`message_id`);--> statement-breakpoint
CREATE INDEX `idx_whatsapp_messages_created_at` ON `whatsapp_messages` (`created_at`);--> statement-breakpoint
ALTER TABLE `orders` ADD `whatsapp_window_opened_at` text;--> statement-breakpoint
PRAGMA optimize;
