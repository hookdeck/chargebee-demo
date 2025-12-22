import { Request, Response } from "express";
import { WebhookEventType, WebhookEvent } from "chargebee";

/**
 * Subscription Webhook Handler
 *
 * Processes subscription lifecycle events from Chargebee:
 * - subscription_created: New subscription started
 * - subscription_renewed: Subscription renewed successfully
 * - subscription_changed: Plan, addons, or billing changed
 *
 * TUTORIAL NOTE: This handler focuses solely on subscription events,
 * making the code easier to test and maintain.
 */
export function handleSubscriptionWebhook(req: Request, res: Response): void {
  try {
    // Extract event data from Chargebee webhook payload
    // Payload structure: { id, event_type, content: { customer/subscription/... } }
    const { id, event_type } = req.body;

    // TODO: Check if event has already been processed (idempotency)
    // Use event.id to track processed events in your database

    console.log("=".repeat(50));
    console.log("📦 Subscription Event Received");
    console.log("Event ID:", id);
    console.log("Event Type:", event_type);
    console.log("Timestamp:", new Date().toISOString());
    console.log("=".repeat(50));

    // Handle subscription events
    switch (event_type) {
      case WebhookEventType.SubscriptionCreated: {
        const subscriptionCreatedEvent: WebhookEvent<WebhookEventType.SubscriptionCreated> =
          req.body;
        const subscription = subscriptionCreatedEvent.content.subscription;
        console.log(`✅ New subscription created: ${subscription.id}`);
        console.log(`   Customer ID: ${subscription.customer_id}`);
        console.log(`   Plan ID: ${subscription.plan_id}`);
        console.log(`   Status: ${subscription.status}`);
        // TODO: Provision access/entitlements for the customer
        break;
      }

      case "subscription_renewed": {
        const subscriptionRenewedEvent: WebhookEvent<WebhookEventType.SubscriptionRenewed> =
          req.body;
        const subscription = subscriptionRenewedEvent.content.subscription;
        console.log(`🔄 Subscription renewed: ${subscription.id}`);
        console.log(`   Customer ID: ${subscription.customer_id}`);
        console.log(`   Next billing at: ${subscription.next_billing_at}`);
        // TODO: Extend access period for the customer
        break;
      }

      case "subscription_changed": {
        const subscriptionChangedEvent: WebhookEvent<WebhookEventType.SubscriptionChanged> =
          req.body;
        const subscription = subscriptionChangedEvent.content.subscription;
        console.log(`🔄 Subscription changed: ${subscription.id}`);
        console.log(`   Customer ID: ${subscription.customer_id}`);
        console.log(`   Plan ID: ${subscription.plan_id}`);
        console.log(`   Status: ${subscription.status}`);
        // TODO: Update entitlements based on plan changes
        break;
      }

      default:
        console.log(`ℹ️  Unhandled subscription event: ${event_type}`);
    }

    res.status(200).json({
      received: true,
      event_id: id,
      event_type,
    });
  } catch (error) {
    console.error("❌ Error processing subscription webhook:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
