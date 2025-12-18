import { Request, Response } from "express";
import { WebhookEventType, WebhookEvent } from "chargebee";

/**
 * Payment Webhook Handler
 *
 * Processes successful payment events from Chargebee:
 * - payment_succeeded: Payment processed successfully
 *
 * TUTORIAL NOTE: By separating payment events into their own handler,
 * you can easily add payment-specific logic like revenue tracking or
 * analytics without affecting other event handlers.
 */
export function handlePaymentsWebhook(req: Request, res: Response): void {
  try {
    // Extract event data from Chargebee webhook payload
    // Payload structure: { id, event_type, content: { customer/subscription/... } }
    const { id, event_type } = req.body;

    // TODO: Check if event has already been processed (idempotency)
    // Use event.id to track processed events in your database

    console.log("=".repeat(50));
    console.log("💳 Payment Event Received");
    console.log("Event ID:", id);
    console.log("Event Type:", event_type);
    console.log("Timestamp:", new Date().toISOString());
    console.log("=".repeat(50));

    // Handle payment events
    if (event_type === WebhookEventType.PaymentSucceeded) {
      const paymentSucceededEvent: WebhookEvent<WebhookEventType.PaymentSucceeded> =
        req.body;
      const transaction = paymentSucceededEvent.content.transaction;
      console.log(`✅ Payment succeeded: ${transaction.id}`);
      console.log(`   Customer ID: ${transaction.customer_id}`);
      console.log(
        `   Amount: ${transaction.amount! / 100} ${transaction.currency_code}`,
      );
      console.log(`   Subscription ID: ${transaction.subscription_id}`);
      // TODO: Update revenue metrics
      // TODO: Clear any "pending renewal" flags
      // TODO: Send payment confirmation email
    } else {
      console.log(`ℹ️  Unhandled payment event: ${event_type}`);
    }

    res.status(200).json({
      received: true,
      event_id: id,
      event_type,
    });
  } catch (error) {
    console.error("❌ Error processing payment webhook:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
