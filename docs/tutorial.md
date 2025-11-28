# Reliable Subscription & Customer Automation with Chargebee Billing Webhooks and the Hookdeck Event Gateway

Chargebee Billing webhooks enable business automation around your subscription lifecycle. You can provision access when subscriptions are created, update user entitlements when plans change, extend access on successful renewals, sync customer data to internal systems, track revenue from payments, and trigger email notifications for lifecycle events.

This tutorial shows you how to build reliable handlers for subscription, customer, and payment events. You create focused handlers for each event type and use event routing to separate concerns in your application.

Webhook reliability challenges impact these workflows directly. Network failures result in missed provisioning. Duplicate events risk double-charging or double-provisioning. Debugging webhook issues delays time-sensitive operations. Without proper infrastructure, managing these workflows is error-prone.

This tutorial uses the [Hookdeck Event Gateway](https://hookdeck.com/event-gateway?ref=chargebee) to address these problems. The Event Gateway provides automatic retries, duplicate detection, event routing, and observability. You configure Chargebee to send all events to a single Event Gateway endpoint, which routes them to the appropriate handlers in your application.

```
Chargebee → Hookdeck Event Gateway → Application Endpoints
                                    ├─ /webhooks/chargebee/customer
                                    ├─ /webhooks/chargebee/subscription
                                    └─ /webhooks/chargebee/payments
```

If you prefer to dive directly into the code, you can find the complete implementation in the [Chargebee Billing Hookdeck demo GitHub repository](https://github.com/hookdeck/chargebee-billing-demo).

## Prerequisites

- Chargebee account with API key ([start a trial](https://www.chargebee.com/trial-signup/))
- Free Hookdeck account ([sign up](https://dashboard.hookdeck.com/signup?ref=chargebee))
- Node.js v18 or later
- Basic understanding of webhooks and HTTP
- [Hookdeck CLI](https://hookdeck.com/docs/cli?ref=chargebee) installed and authenticated (for local development)

### Clone the Repository

Clone the demo repository to get started:

```bash
git clone https://github.com/hookdeck/chargebee-billing-demo.git
cd chargebee-billing-demo
npm install
```

### Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Hookdeck
HOOKDECK_API_KEY=your_hookdeck_api_key

# Chargebee
CHARGEBEE_API_KEY=your_chargebee_api_key
CHARGEBEE_SITE_NAME=your_site_name
CHARGEBEE_WEBHOOK_USERNAME=your_webhook_username
CHARGEBEE_WEBHOOK_PASSWORD=your_webhook_password
```

The tutorial walks through the code in this repository, explaining the architecture and implementation of each component.

## Architecture Overview

Chargebee sends all webhook events to a single Event Gateway Source URL. Event Gateway authenticates incoming requests using Basic Auth credentials that you configure in both systems.

Three Event Gateway Connections route events to focused handlers based on the `event_type` field. The customer handler syncs profile changes to your internal CRM or database. The subscription handler provisions access, updates entitlements, and processes renewals. The payment handler tracks revenue, confirms renewals, and updates billing status.

This architecture provides separation of concerns, easier testing, and independent scaling. Each handler focuses on a specific workflow. You can update customer sync logic without affecting subscription provisioning. You can scale payment processing independently from customer updates.

For deeper understanding of Hookdeck Event Gateway concepts, see the [Hookdeck Event Gateway Basics](https://hookdeck.com/docs/hookdeck-basics?ref=chargebee) documentation.

## Programmatic Infrastructure Setup

Manual webhook configuration leads to drift between development, staging, and production environments. Credentials can mismatch, event subscriptions can diverge, and debugging becomes difficult. Infrastructure as code (IaC) solves these problems by making setup idempotent and version-controlled.

The repository includes a setup script at `scripts/upsert-connections.ts` that programmatically creates both the Hookdeck Event Gateway Connections and the Chargebee webhook endpoint. The following steps walk through what this script does.

## Step 1 — Programmatically Create Hookdeck Event Gateway Connections

Create the Event Gateway resources first because this step generates the webhook URL that Chargebee needs.

Before running the script, understand what it does by examining the code.

### Creating the Event Gateway Source

The Source provides the webhook URL that Chargebee will send events to. It also configures authentication to validate the source of the webhook requests:

```typescript
const sourceResponse = await fetch(
  "https://api.hookdeck.com/2025-07-01/sources",
  {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${HOOKDECK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "chargebee",
      type: "CHARGEBEE_BILLING",
      config: {
        auth: {
          username: process.env.CHARGEBEE_WEBHOOK_USERNAME,
          password: process.env.CHARGEBEE_WEBHOOK_PASSWORD,
        },
      },
    }),
  },
);

const source = await sourceResponse.json();
const hookdeckSourceUrl = source.url;
const hookdeckSourceId = source.id;
```

This generates a unique URL that Chargebee will send webhooks to. The Basic Auth credentials secure the endpoint and must match what you configure in Chargebee. The PUT method makes this operation idempotent, so you can safely re-run it across environments. The script stores `hookdeckSourceUrl` in a variable for use when creating the Chargebee webhook endpoint.

### Creating Connections

Each Connection defines a route from the Source to a specific Destination. Connections include filter rules that determine which events they handle:

```typescript
const customerConnection = {
  name: "chargebee-customer",
  source_id: source.id,
  destination: {
    name: "customer-handler",
    type: "CLI",
    config: { path: "/webhooks/chargebee/customer" },
  },
  rules: [
    {
      type: "filter",
      body: {
        event_type: { $startsWith: "customer_" },
      },
    },
  ],
};

await fetch("https://api.hookdeck.com/2025-07-01/connections", {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${HOOKDECK_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(customerConnection),
});
```

The filter rule routes all events where `event_type` starts with `customer_` to this Connection's Destination. The `type: "CLI"` configuration is for local development with the Hookdeck CLI. For production deployments, use `type: "HTTP"` with a full URL in the config.

The subscription and payment Connections follow the same pattern with different filters and paths. The complete setup creates this routing table:

| Connection   | Filter                                   | Destination                        |
| ------------ | ---------------------------------------- | ---------------------------------- |
| Customer     | `event_type` starts with `customer_`     | `/webhooks/chargebee/customer`     |
| Subscription | `event_type` starts with `subscription_` | `/webhooks/chargebee/subscription` |
| Payment      | `event_type` equals `payment_succeeded`  | `/webhooks/chargebee/payments`     |

See the [Event Gateway Connection Rules documentation](https://hookdeck.com/docs/connections#connection-rules?ref=chargebee) for details on Filters and other supported rules including deduplication and transformation.

## Step 2 — Programmatically Create the Chargebee Billing Webhook Endpoint

Configure Chargebee to send events to the Event Gateway Source URL. The same setup script also creates the Chargebee webhook endpoint.

### Creating the Webhook Endpoint

```typescript
async function createChargebeeWebhookEndpoint(
  apiKey: string,
  siteName: string,
  webhookUrl: string,
  username: string,
  password: string,
): Promise<void> {
  const auth = Buffer.from(`${apiKey}:`).toString("base64");

  // List of webhook events to subscribe to
  const eventTypes = [
    "customer_created",
    "customer_changed",
    "subscription_created",
    "subscription_renewed",
    "subscription_changed",
    "payment_succeeded",
  ];

  const params = new URLSearchParams({
    name: "Hookdeck Webhook Endpoint",
    url: webhookUrl,
    api_version: "v2",
    basic_auth_username: username,
    basic_auth_password: password,
  });

  eventTypes.forEach((event, index) => {
    params.append(`enabled_events[${index}]`, event);
  });

  const response = await fetch(
    `https://${siteName}.chargebee.com/api/v2/webhook_endpoints`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    },
  );

  if (!response.ok) {
    const data = await response.json();
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
  }
}
```

The `url` parameter uses the Event Gateway Source URL. The Basic Auth credentials must match those configured in the Source, or requests will fail authentication.

This example shows six essential event types. The actual implementation uses `ALL_WEBHOOK_EVENTS` from `scripts/shared.ts`, which includes all 21 Chargebee Billing webhook events for production use. The full script also checks for existing endpoints and updates them instead of creating duplicates.

### Running the Setup Script

Now that you understand how the infrastructure is created, run the setup script:

```bash
npm run connections:upsert:dev
```

This script executes the code shown above, creating:

1. Event Gateway Source → receives webhook URL
2. Three Event Gateway Connections for event routing
3. Chargebee webhook endpoint configured with the Event Gateway Source URL

The script outputs the Event Gateway Source URL that Chargebee will send events to. You can view your Connections in the [Hookdeck dashboard](https://dashboard.hookdeck.com?ref=chargebee) and check your Chargebee webhook settings to confirm the endpoint was created successfully.

![Hookdeck dashboard showing three Event Gateway Connections with CLI Destinations for Chargebee events: chargebee-customer routing to /webhooks/chargebee/customer, chargebee-subscription routing to /webhooks/chargebee/subscription, and chargebee-payment routing to /webhooks/chargebee/payments](images/event-gateway-connections-dev.png)

_Caption: Event Gateway Connections in the Hookdeck dashboard routing Chargebee events to specific handlers via the Hookdeck CLI_

Events now flow: Chargebee sends → Event Gateway authenticates and routes → Your handlers process.

## Step 3 — Implement Minimal Handlers for Each Workflow

With Connections routing events to the appropriate endpoints, you now implement handlers to process those events. Each handler focuses on a specific domain—customer synchronization, subscription provisioning, or payment tracking. This separation keeps your code maintainable and testable.

These handlers provide the foundational structure: authentication, event routing, error handling, and response formatting. Each handler extracts event data from the webhook payload, processes it based on the event type, and returns a 200 OK response to confirm successful delivery. The actual business logic—syncing to your CRM, provisioning access, or updating billing status—is represented by comments and would be implemented based on your specific requirements.

The examples below are simplified for clarity. The actual implementations in `src/handlers/` include detailed logging and TODO comments for idempotency checks—covered in the Idempotency section later in this step.

### Express Application Setup

The Express application in `src/index.ts` provides a foundation for the three webhook handlers. Authentication middleware protects all webhook routes, and each handler is mounted at the path specified in the Connection configuration.

This is the complete `src/index.ts` file:

```typescript
import express from "express";
import { handleCustomerWebhook } from "./handlers/customer";
import { handleSubscriptionWebhook } from "./handlers/subscription";
import { handlePaymentsWebhook } from "./handlers/payments";
import { verifyHookdeckSignature } from "./middleware/hookdeck-auth";
import { verifyChargebeeAuth } from "./middleware/chargebee-auth";

const app = express();

app.use(express.json());

// Apply authentication to all webhook routes
app.use("/webhooks", verifyHookdeckSignature, verifyChargebeeAuth);

app.post("/webhooks/chargebee/customer", handleCustomerWebhook);
app.post("/webhooks/chargebee/subscription", handleSubscriptionWebhook);
app.post("/webhooks/chargebee/payments", handlePaymentsWebhook);

app.listen(4000);
```

The authentication middleware verifies both the Hookdeck webhook signature and Chargebee's Basic Auth credentials. This ensures that requests come from the Event Gateway and originated from Chargebee. The three route handlers map directly to the Destination paths configured in the Connections from Step 1.

### Customer Handler

The customer handler processes profile creation and updates in `src/handlers/customer.ts`. When customers are created or modified in Chargebee, this handler receives the event and can sync that data to your internal CRM or database.

```typescript
export function handleCustomerWebhook(req: Request, res: Response): void {
  try {
    const { id, event_type, content } = req.body;
    const customer = content?.customer;

    if (!customer) {
      res.status(200).json({ received: true });
      return;
    }

    // TODO: Check if event has already been processed (idempotency)

    switch (event_type) {
      case "customer_created":
        console.log(`New customer: ${customer.id}`);
        console.log(`Email: ${customer.email}`);
        // Sync customer to internal CRM/database
        break;

      case "customer_changed":
        console.log(`Customer updated: ${customer.id}`);
        // Update customer record in internal systems
        break;
    }

    // TODO: Mark event as processed (idempotency)

    res.status(200).json({
      received: true,
      event_id: id,
      customer_id: customer.id,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
}
```

The handler extracts event data from the webhook payload, switches on the event type, and logs the relevant information. This foundation allows you to replace the console logs with database operations or API calls to your internal systems. The 200 response confirms successful processing to the Event Gateway.

### Subscription Handler

The subscription handler manages the subscription lifecycle in `src/handlers/subscription.ts`. It provisions access when subscriptions are created, updates entitlements when plans change, and extends access on successful renewals.

```typescript
export function handleSubscriptionWebhook(req: Request, res: Response): void {
  try {
    const { id, event_type, content } = req.body;
    const subscription = content?.subscription;

    if (!subscription) {
      res.status(200).json({ received: true });
      return;
    }

    // TODO: Check if event has already been processed (idempotency)

    switch (event_type) {
      case "subscription_created":
        console.log(`New subscription: ${subscription.id}`);
        console.log(`Customer: ${subscription.customer_id}`);
        console.log(`Plan: ${subscription.plan_id}`);
        // Provision access/entitlements
        break;

      case "subscription_renewed":
        console.log(`Subscription renewed: ${subscription.id}`);
        // Extend access period
        break;

      case "subscription_changed":
        console.log(`Subscription changed: ${subscription.id}`);
        console.log(`New plan: ${subscription.plan_id}`);
        // Update entitlements based on plan changes
        break;
    }

    // TODO: Mark event as processed (idempotency)

    res.status(200).json({
      received: true,
      event_id: id,
      subscription_id: subscription.id,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
}
```

Each event type maps to a specific business operation. Subscription creation triggers access provisioning. Renewals extend existing access. Changes update entitlements based on the new plan. This separation makes each operation clear and testable.

### Payment Handler

The payment handler tracks successful payments in `src/handlers/payments.ts`. This enables revenue tracking, renewal confirmation, and billing status updates without mixing payment logic into the subscription handler.

```typescript
export function handlePaymentsWebhook(req: Request, res: Response): void {
  try {
    const { id, event_type, content } = req.body;
    const transaction = content?.transaction;

    if (!transaction) {
      res.status(200).json({ received: true });
      return;
    }

    // TODO: Check if event has already been processed (idempotency)

    if (event_type === "payment_succeeded") {
      console.log(`Payment succeeded: ${transaction.id}`);
      console.log(`Customer: ${transaction.customer_id}`);
      console.log(
        `Amount: ${transaction.amount / 100} ${transaction.currency_code}`,
      );
      // Update revenue metrics
      // Clear "pending renewal" flags
      // Send payment confirmation email
    }

    // TODO: Mark event as processed (idempotency)

    res.status(200).json({
      received: true,
      event_id: id,
      transaction_id: transaction.id,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
}
```

Separating payment events into their own handler makes it easy to add payment-specific logic like analytics or confirmation emails. This handler remains focused on payment processing without affecting customer or subscription workflows.

### Idempotency

You are responsible for implementing idempotency in your handlers. Use the event `id` field to track which events you've already processed. Store processed event IDs to ensure operations like provisioning access or charging customers happen exactly once per event.

While the Event Gateway can reduce duplicate delivery through its [deduplication feature](https://hookdeck.com/docs/deduplication?ref=chargebee), it doesn't eliminate the need for handler-level deduplication. Network issues or application restarts can cause the same event to be delivered multiple times.

**Simple Idempotency with Retry on Failure**

Record the event first to prevent duplicate processing, and clean up on failure to allow the Event Gateway to retry:

```typescript
export async function handleCustomerWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  let claimed = false;

  try {
    const { id, event_type, content } = req.body;

    // Check if already processed
    const existing = await db.processedEvents.findOne({ eventId: id });
    if (existing) {
      res.status(200).json({ received: true, event_id: id });
      return;
    }

    // Atomically claim this event
    try {
      await db.processedEvents.create({
        eventId: id,
        processedAt: new Date(),
      });
      claimed = true;
    } catch (error) {
      // Another instance claimed it
      if (error.code === "ER_DUP_ENTRY" || error.code === "23505") {
        res.status(200).json({ received: true, event_id: id });
        return;
      }
      throw error;
    }

    // Process the event
    switch (event_type) {
      case "customer_created":
        // Handle customer creation
        break;
    }

    res.status(200).json({ received: true, event_id: id });
  } catch (error) {
    // Clean up so Event Gateway can retry
    if (claimed) {
      try {
        await db.processedEvents.delete({ eventId: id });
      } catch (deleteError) {
        // If delete fails, log it but still return 500 to trigger retry
        console.error(`Failed to delete event ${id}:`, deleteError);
      }
    }
    res.status(500).json({ error: "Internal server error" });
  }
}
```

Ensure your `processedEvents` table has a unique constraint on the `eventId` column:

```sql
CREATE TABLE processed_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  processed_at TIMESTAMP NOT NULL
);
```

This pattern prevents duplicate processing while allowing retries on failure. The `claimed` flag ensures we only delete records we created, preventing interference with other instances.

## Step 4 — Testing the Flow End-to-End

With the infrastructure created and the handler code explained, you now run the application to verify the complete flow from Chargebee through the Event Gateway to your handlers.

### Start the Application

Start the Express server:

```bash
npm run dev
```

### Install and Authenticate the Hookdeck CLI

In a separate terminal, install and authenticate the Hookdeck CLI:

```bash
npm install -g hookdeck-cli
hookdeck login
```

Once installed and logged in, start the Hookdeck CLI to forward events to your local server:

```bash
hookdeck listen 4000 chargebee
```

You'll see output similar to this which shows you the events are being routed via Connections from the Hookdeck Source to each of your local handlers:

```sh
●── HOOKDECK CLI ──●

Listening on 1 source • 3 connections • [i] Collapse

chargebee
│  Requests to → https://hkdk.events/77lhnnpej9ti65
├─ Forwards to → http://localhost:4000/webhooks/chargebee/payments (chargebee-payment)
├─ Forwards to → http://localhost:4000/webhooks/chargebee/subscription (chargebee-subscription)
└─ Forwards to → http://localhost:4000/webhooks/chargebee/customer (chargebee-customer)

💡 View dashboard to inspect, retry & bookmark events: https://dashboard.hookdeck.com/events/cli?team_id=X
```

The CLI creates a secure tunnel between the Event Gateway and your development environment without exposing your machine to the internet. Events now flow: Chargebee → Event Gateway → CLI → `localhost:4000`.

### Triggering Test Events

The simplest test is to use the **Test Webhook** feature in Chargebee's webhook settings. This sends a sample payload to your Event Gateway Source endpoint, allowing you to verify that the event is received and routed correctly.

To test real workflows, create test customers and subscriptions in Chargebee's test mode. Chargebee automatically sends webhook events to the Event Gateway endpoint you configured in Step 2.

Log into your Chargebee test site, create a customer with an email and billing information, then create a subscription for that customer with a test plan. Chargebee generates `customer_created` and `subscription_created` events and sends them to the Event Gateway.

### Verifying Event Delivery

Check multiple points in the flow to confirm events are processed correctly:

- **Hookdeck Dashboard**: View incoming events in real-time, inspect payloads, and see which Connection handled each event
- **Connection Routing**: Verify that customer events route to the customer handler, subscription events to the subscription handler
- **Application Logs**: Check your terminal for handler output showing event processing
- **Response Status**: Confirm that handlers return 200 OK and the Event Gateway marks deliveries as successful

![Hookdeck Event Gateway dashboard showing a customer_created event from Chargebee with successful delivery status](images/hookdeck-dashboard-event-list.png)

_Caption: Event delivery in the Hookdeck Event Gateway dashboard_

The dashboard shows event details including the full payload, headers, and delivery attempts. Click into an event to see the JSON structure and verify that your handler received the correct data.

![Hookdeck event details view displaying the JSON payload of a customer_created event and successful delivery attempt with 200 OK response](images/hookdeck-event-details.png)

_Caption: Event details showing successful delivery and handler response_

### What Success Looks Like

A successful test produces these results:

- Event appears in the Hookdeck dashboard within seconds of creation in Chargebee
- Correct Connection routes the event based on the filter rules you configured
- Hookdeck CLI logs the event in your terminal before forwarding it to your local endpoint
- Handler processes the event and logs relevant information to your terminal
- Event Gateway marks the delivery as successful with a 200 OK response
- No errors appear in application logs or the Hookdeck dashboard

### Inspecting and Retrying Events with the CLI

When developing locally, the Hookdeck CLI provides an interactive terminal interface for real-time event inspection and retry capabilities. This streamlines your development workflow by letting you debug webhook handlers quickly without repeatedly triggering new events from Chargebee.

The CLI displays events in an interactive list as they flow from Chargebee through the Event Gateway to your local handlers. Navigate through events using keyboard shortcuts, press `d` to inspect full payloads and response details, and use `r` to retry events directly to your current handler code. This creates a fast debugging cycle: inspect an event, update your handler code, retry the event, and verify the fix—all without leaving your terminal.

Testing with real Chargebee event data means your handlers encounter the exact field structure, edge cases, and data variations they'll handle in production. The convenience of retrying events directly from your terminal keeps you in your development environment, avoiding context switches to the Chargebee dashboard.

For full command documentation, keyboard shortcuts, and advanced CLI features, see the [Hookdeck CLI documentation](https://hookdeck.com/docs/cli?ref=chargebee).

### Troubleshooting

Common issues and solutions:

- **Event not reaching the Event Gateway**: Verify the webhook endpoint URL in Chargebee matches the Source URL. Check that Basic Auth credentials match between Chargebee and the Event Gateway. You'll see authentication errors in the **Requests** section of the Hookdeck dashboard if they don't match.
- **Event not routed**: Check Connection filter rules in the Hookdeck dashboard. Verify that the event type matches your filter patterns (`customer_`, `subscription_`, `payment_succeeded`). Requests that don't match any Connection rules are marked as **Filtered** in the **Requests** section.
- **Handler errors**: Check application logs for error messages. Verify that the handler is correctly extracting data from the payload structure.
- **Authentication issues**: Confirm that the Basic Auth credentials in your `.env` file match what you configured in the Event Gateway and Chargebee. Check that Hookdeck signature verification middleware is configured correctly.

## Step 5 — Deploy to Production

After testing your integration locally and confirming that events flow correctly through the Event Gateway to your handlers, you're ready to deploy to production. The same setup script (`scripts/upsert-connections.ts`) that created your development infrastructure works for production environments with production environment variables. This ensures your production environment matches your tested development configuration.

### Running the Production Setup

Execute the setup script in production mode to create or update your production infrastructure:

```bash
npm run connections:upsert:prod
```

This command performs the following operations:

- Creates or updates Event Gateway Connections with HTTP destinations (not CLI) pointing to your production servers
- Uses the `PROD_DESTINATION_URL` environment variable for destination URLs
- Creates or updates the Chargebee webhook endpoint to point to your production Hookdeck Source

![Hookdeck dashboard showing three Event Gateway Connections with HTTP Destinations for Chargebee events: chargebee-customer routing to /webhooks/chargebee/customer, chargebee-subscription routing to /webhooks/chargebee/subscription, and chargebee-payment routing to /webhooks/chargebee/payments](images/event-gateway-connections-prod.png)

_Caption: Event Gateway Connections in the Hookdeck dashboard routing Chargebee events to specific production handlers_

### Initial Production Deployment

For your first deployment to production, you can use the same [Hookdeck project](https://hookdeck.com/docs/projects?ref=chargebee) and Chargebee site that you used for development:

1. Update your environment variables:
   - Set `PROD_DESTINATION_URL` to your production server URL
   - Keep `CHARGEBEE_API_KEY`, `CHARGEBEE_SITE`, and `HOOKDECK_API_KEY` unchanged

2. Run the setup script to update your Connections to point to production handlers

This approach gets your integration into production quickly without managing multiple environments.

### Setting Up Separate Test and Production Environments

After your initial production deployment, create separate test and production environments for safer development workflows. This is the **recommended approach for ongoing development** and prevents test events from mixing with production data.

**Separate Hookdeck Projects:**

Create dedicated Hookdeck projects for each environment. You can have as many projects as you need—common setups include development, staging, and production:

1. Create a new [Hookdeck project](https://hookdeck.com/docs/projects?ref=chargebee) for each environment in the [Hookdeck dashboard](https://dashboard.hookdeck.com?ref=chargebee)
2. Update your `.env` file for each environment:
   - Set `HOOKDECK_API_KEY` to the corresponding project's API key
   - Set `PROD_DESTINATION_URL` to the appropriate server URL (development, staging, or production)

**Separate Chargebee Sites:**

Use separate Chargebee sites for test and production:

1. Use your existing Chargebee site for production
2. Create a new Chargebee test site or use Chargebee's test mode
3. Update your development `.env` file:
   - Set `CHARGEBEE_API_KEY` and `CHARGEBEE_SITE` to your test site credentials
   - Keep production credentials in your production environment configuration

**Benefits of Separate Environments:**

- Complete isolation between test and production webhook traffic
- Separate monitoring and alerting for production events
- Safe testing of breaking changes without affecting production
- Clear separation of test data from production customer data
- Independent scaling and rate limiting per environment

After creating separate environments, run the setup script in each environment to create identical infrastructure with environment-specific configurations.

### Verification

After running the production setup, verify that everything is configured correctly:

1. **Check the Hookdeck dashboard**: Confirm that Connections are created or updated with the correct destination URLs
2. **Verify the Chargebee webhook endpoint**: Log into your Chargebee site and check that the webhook endpoint points to your production Hookdeck Source URL
3. **Trigger a test event**: Create a test customer or subscription in your Chargebee production/live site
4. **Confirm event flow**: Verify that events appear in the Hookdeck dashboard and are successfully delivered to your production handlers

The consistency between your development and production setups ensures that the behavior you tested locally matches what runs in production. Any routing rules, authentication configurations, or event filters work identically in both environments.

## Tips and Best Practices

Follow these practices to build reliable and maintainable webhook integrations:

- **Idempotency**: Implement the idempotency pattern shown in Step 3 to handle duplicate events safely. Store processed event IDs and use the event `id` field as your deduplication key.

- **Monitoring**: Set up Issue Triggers for critical Connections to receive alerts when delivery fails. Configure Issue Triggers for your subscription and payment Connections first, as these directly impact revenue and customer access. See the [Hookdeck Issues documentation](https://hookdeck.com/docs/issues?ref=chargebee) for configuration details.

- **Delivery Rate Management**: Configure destination rate limits to prevent overwhelming your servers during high-traffic periods. Set maximum delivery rates that match your application's processing capacity. For details on configuring rate limits, see the [Hookdeck Destinations documentation](https://hookdeck.com/docs/destinations?ref=chargebee).

- **Event Retries**: Use the dashboard or API for bulk retry operations when recovering from handler failures or application downtime. After resolving issues, retry failed events to complete missed operations. Learn more in the [Hookdeck Retries documentation](https://hookdeck.com/docs/retries?ref=chargebee).

- **Testing**: Always test with Chargebee's test site before deploying to production. Create test customers, subscriptions, and payments to verify your handlers work correctly with real event structures. Testing in Chargebee's test environment prevents errors from affecting actual customer data.

## Conclusion

You've built a reliable webhook integration that handles Chargebee subscription, customer, and payment events using infrastructure as code. The setup script programmatically creates Event Gateway Connections and Chargebee webhook endpoints, ensuring consistency across development and production environments.

The Event Gateway routes events to focused handlers based on event type, providing automatic retries and observability. Your handlers implement idempotency to safely handle duplicate events and enable retry-on-failure. This architecture keeps each handler focused on specific business workflows—customer sync, subscription provisioning, or payment tracking—making your code maintainable as you add more event types.

You tested the complete flow using the Hookdeck CLI for local development, verifying that events are authenticated, routed correctly, and processed successfully. The same infrastructure setup deploys to production, maintaining consistency between environments.

### Next Steps

Explore the complete implementation in the [Chargebee Billing with Hookdeck Event Gateway repository](https://github.com/hookdeck/chargebee-billing-demo) to see production-ready handler code with detailed logging and error handling.

Continue building on this foundation:

- **Add more event types**: Expand your integration to handle additional Chargebee events like subscription cancellations, trial conversions, or refund processing
- **Implement business logic**: Replace the TODO placeholders in your handlers with actual implementations—sync customers to your CRM, provision access based on subscriptions, update revenue metrics from payments, or send lifecycle email notifications
- **Set up monitoring**: Configure Issue Triggers and notification channels to stay informed about integration health and delivery failures

Learn more about Chargebee's webhook capabilities in the [Chargebee documentation](https://apidocs.chargebee.com/docs/api/events) and explore Event Gateway features in the [Hookdeck Event Gateway Documentation](https://hookdeck.com/docs?ref=chargebee).
