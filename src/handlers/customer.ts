import { Request, Response } from "express";

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
    const { id, event_type, content } = req.body;

    // TODO: Check if event has already been processed (idempotency)
    // Use event.id to track processed events in your database

    console.log("=".repeat(50));
    console.log("📋 Customer Event Received");
    console.log("Event ID:", id);
    console.log("Event Type:", event_type);
    console.log("Timestamp:", new Date().toISOString());
    console.log("=".repeat(50));

    const customer = content?.customer;

    if (!customer) {
      console.warn("No customer data in payload");
      res.status(200).json({ received: true, warning: "No customer data" });
      return;
    }

    // Handle customer events
    switch (event_type) {
      case "customer_created":
        console.log(`✅ New customer created: ${customer.id}`);
        console.log(`   Email: ${customer.email}`);
        console.log(`   Name: ${customer.first_name} ${customer.last_name}`);
        // TODO: Sync customer to internal CRM/database
        break;

      case "customer_changed":
        console.log(`🔄 Customer updated: ${customer.id}`);
        console.log(`   Email: ${customer.email}`);
        // TODO: Update customer record in internal systems
        break;

      default:
        console.log(`ℹ️  Unhandled customer event: ${event_type}`);
    }

    res.status(200).json({
      received: true,
      event_id: id,
      event_type,
      customer_id: customer.id,
    });
  } catch (error) {
    console.error("❌ Error processing customer webhook:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
