# Chargebee Billing Hookdeck Event Gateway Demo

A production-ready TypeScript Express.js application for reliable [Chargebee](https://www.chargebee.com) webhook integration using the [Hookdeck](https://hookdeck.com) Event Gateway. This demo provides programmatic setup, filtered event routing, and focused handlers for subscription lifecycle automation.

## Overview

This project demonstrates how to build reliable webhook handlers for [Chargebee Billing](https://www.chargebee.com) subscription, customer, and payment events. Chargebee webhooks enable business automation around your subscription lifecycle—provision access when subscriptions are created, update user entitlements when plans change, extend access on successful renewals, sync customer data to internal systems, track revenue from payments, and trigger notifications for lifecycle events.

The application uses the [Hookdeck Event Gateway](https://hookdeck.com) to solve common webhook reliability challenges: automatic retries for network failures, duplicate detection to prevent double-processing, filtered event routing to separate concerns, and comprehensive observability for debugging.

**Key Features:**

- **Filtered Event Routing** - Chargebee sends all events to a single Hookdeck endpoint, which routes them to focused handlers based on `event_type`
- **Business Use Cases** - Subscription provisioning, payment tracking, and customer synchronization
- **Programmatic Setup** - Automated scripts create Hookdeck Connections and Chargebee webhook endpoints
- **Dual Authentication** - Hookdeck signature verification and Chargebee Basic Auth
- **Modular Architecture** - Separate handlers for customer, subscription, and payment workflows
- **TypeScript** - Type safety and better developer experience

## How It Works

```
Chargebee → Hookdeck Event Gateway → Application Endpoints
                                    ├─ /webhooks/chargebee/customer
                                    ├─ /webhooks/chargebee/subscription
                                    └─ /webhooks/chargebee/payments
```

Chargebee sends all webhook events to a single Hookdeck Source URL. Hookdeck authenticates incoming requests using Basic Auth credentials configured in both systems. Three Hookdeck Connections route events to focused handlers based on the `event_type` field:

- **Customer handler** syncs profile changes to your CRM or database
- **Subscription handler** provisions access, updates entitlements, and processes renewals
- **Payment handler** tracks revenue, confirms renewals, and updates billing status

This architecture provides separation of concerns, easier testing, and independent scaling. Each handler focuses on a specific workflow without affecting others.

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- A [Chargebee account](https://www.chargebee.com/trial-signup/) (with API key)
- A [Hookdeck account](https://dashboard.hookdeck.com/signup) (free tier available)
- Hookdeck CLI installed and authenticated (for local development)

## Installation

1. Clone this repository:

```bash
git clone <repository-url>
cd chargebee-demo
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` and set your values:

```bash
PORT=4000

# Chargebee Configuration
CHARGEBEE_SITE=your_chargebee_site_name
CHARGEBEE_API_KEY=your_chargebee_api_key
CHARGEBEE_WEBHOOK_USERNAME=your_webhook_username
CHARGEBEE_WEBHOOK_PASSWORD=your_webhook_password

# Hookdeck Configuration
HOOKDECK_API_KEY=your_hookdeck_api_key
HOOKDECK_WEBHOOK_SECRET=your_hookdeck_webhook_secret

# Production Destination URL (for prod mode only)
PROD_DESTINATION_URL=https://your-production-domain.com
```

## Setup Webhook Connections

**Important:** Before running the application, you must set up the webhook connections between Chargebee and Hookdeck.

### Development Mode Setup

For local development with Hookdeck CLI:

1. **Create the webhook connections**:

```bash
npm run connections:upsert:dev
```

This configures Hookdeck to forward webhooks to your local development server via the CLI.

2. **Install and authenticate the Hookdeck CLI**:

```bash
npm install -g hookdeck-cli
hookdeck login
```

3. **Start the Hookdeck CLI** to forward events to your local server:

```bash
hookdeck listen 4000 chargebee
```

### Production Mode Setup

For production deployment:

```bash
npm run connections:upsert:prod
```

This configures Hookdeck to forward webhooks to your production server URL (specified in `PROD_DESTINATION_URL`).

## Development

After setting up the webhook connections and starting the Hookdeck CLI, run the application in development mode with hot reload:

```bash
npm run dev
```

The server will start on `http://localhost:4000` (or the PORT specified in your `.env` file).

You should now have both the Hookdeck CLI and your application running. The Hookdeck CLI will forward webhook events from Hookdeck to your local server.

## Building for Production

Build the TypeScript code:

```bash
npm run build
```

Run the compiled application:

```bash
npm start
```

## Project Structure

```
chargebee-demo/
├── src/
│   ├── index.ts                      # Main application entry point
│   ├── handlers/
│   │   ├── customer.ts              # Customer event handler
│   │   ├── subscription.ts          # Subscription event handler
│   │   └── payments.ts              # Payment event handler
│   ├── middleware/
│   │   ├── chargebee-auth.ts        # Chargebee Basic Auth verification
│   │   └── hookdeck-auth.ts         # Hookdeck signature verification
│   └── types/
│       └── express.d.ts             # TypeScript type extensions
├── scripts/
│   ├── upsert-connections.ts        # Automated connection setup script
│   ├── clean.ts                     # Cleanup script for Hookdeck resources
│   └── shared.ts                    # Shared types and utilities
├── dist/                            # Compiled JavaScript output
├── .env.example                     # Environment variables template
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

## Webhook Connection Setup

The project includes automated scripts that programmatically create Hookdeck Connections and configure Chargebee webhook endpoints. This approach ensures consistency across environments and eliminates manual configuration drift.

### Understanding the Setup Process

The setup script performs these operations:

1. **Creates a Hookdeck Source** - Generates a webhook URL that Chargebee will send events to, with Basic Auth configured
2. **Creates three Hookdeck Connections** - Each Connection routes specific event types to focused handlers:
   - **Customer Connection**: Routes events where `body.event_type` starts with `customer_` to `/webhooks/chargebee/customer`
   - **Subscription Connection**: Routes events where `body.event_type` starts with `subscription_` to `/webhooks/chargebee/subscription`
   - **Payment Connection**: Routes events where `body.event_type` equals `payment_succeeded` to `/webhooks/chargebee/payments`
3. **Creates Chargebee webhook endpoint** - Configures Chargebee to send events to the Hookdeck Source URL with Basic Auth credentials

The scripts are idempotent—running them multiple times will update existing resources rather than creating duplicates.

### Automated Setup

#### Development Mode Setup

For local development with Hookdeck CLI:

```bash
npm run connections:upsert:dev
```

This creates CLI-type Destinations for local webhook delivery via the Hookdeck CLI. After running this command, start the Hookdeck CLI to forward events to your local server:

```bash
hookdeck listen 4000 chargebee
```

#### Production Mode Setup

For production deployment with HTTP destinations:

```bash
npm run connections:upsert:prod
```

This creates HTTP-type Destinations using your `PROD_DESTINATION_URL`. Ensure you've set `PROD_DESTINATION_URL` in your `.env` file to your production server's base URL.

### Manual Setup

If you prefer manual setup:

1. Sign up for a free Hookdeck account at [hookdeck.com](https://hookdeck.com)

2. Install the Hookdeck CLI:

```bash
npm install -g hookdeck-cli
```

3. Authenticate the CLI:

```bash
hookdeck login
```

4. Create a connection to forward Chargebee webhooks to your local server:

```bash
hookdeck listen 4000 chargebee
```

5. Copy the webhook URL provided by Hookdeck and manually configure it in your Chargebee dashboard under Settings > API Keys & Webhooks > Webhooks

## Authentication

The application uses dual authentication for maximum security:

1. **Hookdeck Signature Verification** - Verifies that webhooks are coming from Hookdeck using HMAC-SHA256 signatures
2. **Chargebee Basic Auth** - Validates the Basic Auth credentials that Chargebee includes with webhooks

Both authentication methods are applied globally to all `/webhooks/*` routes.

## Available Scripts

### Application Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run the production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Setup & Utility Scripts

- `npm run connections:upsert:dev` - Set up Hookdeck and Chargebee connections for development (CLI destinations)
- `npm run connections:upsert:prod` - Set up Hookdeck and Chargebee connections for production (HTTP destinations)
- `npm run connections:clean` - Remove all Hookdeck connections and sources (useful for reset)

## Webhook Endpoints & Event Types

The application provides three focused webhook endpoints, each handling specific Chargebee event types:

### `/webhooks/chargebee/customer`

Handles customer-related events for syncing profile data to your CRM or database:

- `customer_created` - New customer registration
- `customer_changed` - Customer profile updates

**Business Use Case:** When a customer is created or updated in Chargebee, sync their data to your internal systems to maintain a single source of truth.

### `/webhooks/chargebee/subscription`

Handles subscription lifecycle events for provisioning and managing access:

- `subscription_created` - New subscription provisioning
- `subscription_renewed` - Subscription renewal
- `subscription_changed` - Plan changes and updates

**Business Use Case:** Provision access when subscriptions are created, extend access on renewals, and update entitlements when plans change.

### `/webhooks/chargebee/payments`

Handles payment events for revenue tracking and billing operations:

- `payment_succeeded` - Successful payment processing

**Business Use Case:** Track revenue, confirm renewals, update billing status, and send payment confirmation emails.

Each handler extracts event data from the webhook payload, processes it based on the event type, and returns a 200 OK response to confirm successful delivery to Hookdeck. The handlers include TODO comments indicating where to implement idempotency checks and your specific business logic.

## Health Check

The application includes a health check endpoint at `/health` (no authentication required):

```bash
curl http://localhost:4000/health
```

## Deployment

For production deployment:

1. **Set up production environment variables** - Copy `.env.example` to `.env` and configure with production values
2. **Set `PROD_DESTINATION_URL`** - Your production server's base URL (e.g., `https://your-app.com`)
3. **Run production setup** - Execute `npm run connections:upsert:prod` to create HTTP-based Hookdeck Connections
4. **Build the application** - Run `npm run build` to compile TypeScript
5. **Deploy** - Deploy the `dist/` directory and `.env` file to your hosting platform
6. **Start the server** - Run `npm start` on your production server

Hookdeck will forward webhook events from Chargebee to your production endpoints at the configured `PROD_DESTINATION_URL`.

## Idempotency

Implement idempotency in your handlers to ensure operations like provisioning access or charging customers happen exactly once per event. Store processed event IDs using the event `id` field to track which events you've already handled.

The handlers include TODO comments marking where to add idempotency checks. A complete idempotency implementation with retry-on-failure is detailed in the companion tutorial. The pattern uses atomic event claiming with cleanup on failure to enable Event Gateway retries.

While the Event Gateway reduces duplicate delivery, network issues or application restarts can cause the same event to be delivered multiple times, making handler-level deduplication essential.

## License

MIT
