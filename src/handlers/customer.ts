import { Request, Response } from "express";
import { WebhookEventType, WebhookEvent } from "chargebee";

/**
 * Customer Webhook Handler
 *
 * Processes customer lifecycle events from Chargebee:
 * - customer_created: New customer account created
 * - customer_changed: Customer profile updated (email, billing address, etc.)
 *
 * TUTORIAL NOTE: This handler demonstrates the separation of concerns pattern.
 * Each Connection routes specific event types to focused handlers.
 */
export function handleCustomerWebhook(req: Request, res: Response): void {
  try {
    // Extract event data from Chargebee webhook payload
    // Payload structure: { id, event_type, content: { customer/subscription/... } }
    const { id, event_type } = req.body;

    // TODO: Check if event has already been processed (idempotency)
    // Use event.id to track processed events in your database

    console.log("=".repeat(50));
    console.log("📋 Customer Event Received");
    console.log("Event ID:", id);
    console.log("Event Type:", event_type);
    console.log("Timestamp:", new Date().toISOString());
    console.log("=".repeat(50));

    // Handle customer events
    switch (event_type) {
      case WebhookEventType.CustomerCreated: {
        const customerCreatedEvent: WebhookEvent<WebhookEventType.CustomerCreated> =
          req.body;
        const customer = customerCreatedEvent.content.customer;
        console.log(`✅ New customer created: ${customer.id}`);
        console.log(`   Email: ${customer.email}`);
        console.log(`   Name: ${customer.first_name} ${customer.last_name}`);
        // TODO: Sync customer to internal CRM/database
        break;
      }

      case WebhookEventType.CustomerChanged: {
        const customerChangedEvent: WebhookEvent<WebhookEventType.CustomerChanged> =
          req.body;
        const customer = customerChangedEvent.content.customer;
        console.log(`🔄 Customer updated: ${customer.id}`);
        console.log(`   Email: ${customer.email}`);
        // TODO: Update customer record in internal systems
        break;
      }

      default:
        console.log(`ℹ️  Unhandled customer event: ${event_type}`);
    }

    res.status(200).json({
      received: true,
      event_id: id,
      event_type,
    });
  } catch (error) {
    console.error("❌ Error processing customer webhook:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
