# Chargebee Hookdeck Demo

A TypeScript Express.js application demonstrating how to receive Chargebee webhooks via Hookdeck Event Gateway with proper authentication and separation of concerns.

## Overview

This project provides a webhook receiver that integrates Chargebee subscription events with Hookdeck for reliable webhook delivery, monitoring, and debugging. The application features:

- **Separate handlers** for customer, subscription, and payment events
- **Dual authentication** with Hookdeck signature verification and Chargebee Basic Auth
- **Clean architecture** with modular, focused components
- **TypeScript** for type safety and better developer experience

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- A Chargebee account
- A Hookdeck account

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

```bash
npm run connections:upsert:dev
```

This configures Hookdeck to forward webhooks to your local development server via the CLI.

### Production Mode Setup

For production deployment:

```bash
npm run connections:upsert:prod
```

This configures Hookdeck to forward webhooks to your production server URL (specified in `PROD_DESTINATION_URL`).

## Development

After setting up the webhook connections, run the application in development mode with hot reload:

```bash
npm run dev
```

The server will start on `http://localhost:4000` (or the PORT specified in your `.env` file).

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
│   ├── cli-connection.sh            # Hookdeck CLI connection script
│   ├── upsert-connections.ts        # Automated connection setup script
│   ├── clean.ts                     # Cleanup script for Hookdeck resources
│   ├── shared.ts                    # Shared types and utilities
│   └── test-chargebee-auth.sh       # Test Chargebee API authentication
├── dist/                            # Compiled JavaScript output
├── .env.example                     # Environment variables template
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

## Setting Up Webhook Connections

This project provides automated scripts to set up Hookdeck connections and Chargebee webhook configurations.

### Automated Setup (Recommended)

The project includes TypeScript scripts that idempotently create and configure connections:

#### Development Mode Setup

For local development with Hookdeck CLI:

```bash
npm run connections:upsert:dev
```

This will:

- Create a Hookdeck Source for Chargebee webhooks with Basic Auth
- Create CLI-type Destinations for local webhook delivery
- Create three Connections with event filters:
  - **Customer events**: Routes events where `body.event_type` equals `customer_created` or `customer_changed`
  - **Subscription events**: Routes events where `body.event_type` equals `subscription_created`, `subscription_renewed`, or `subscription_changed`
  - **Payment events**: Routes events where `body.event_type` equals `payment_succeeded`
- Create or update the Chargebee webhook endpoint with the Hookdeck Source URL
- Configure Basic Authentication for the Chargebee webhook

#### Production Mode Setup

For production deployment with HTTP destinations:

```bash
npm run connections:upsert:prod
```

This will:

- Create a Hookdeck Source for Chargebee webhooks with Basic Auth
- Create HTTP-type Destinations using your `PROD_DESTINATION_URL`
- Create three Connections with the same event filters as dev mode
- Create or update the Chargebee webhook endpoint with the Hookdeck Source URL
- Configure Basic Authentication for the Chargebee webhook

**Note:** The scripts are idempotent - running them multiple times will update existing Hookdeck connections and Chargebee webhook endpoints rather than creating duplicates.

### Manual Setup

If you prefer manual setup:

1. Sign up for a free Hookdeck account at [hookdeck.com](https://hookdeck.com)

2. Install the Hookdeck CLI:

```bash
npm install -g @hookdeck/cli
```

3. Authenticate the CLI:

```bash
hookdeck login
```

4. Create a connection to forward Chargebee webhooks to your local server:

```bash
hookdeck listen 4000 --source chargebee
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

### Setup Scripts

- `npm run connections:upsert:dev` - Set up Hookdeck and Chargebee connections for development (CLI destinations)
- `npm run connections:upsert:prod` - Set up Hookdeck and Chargebee connections for production (HTTP destinations)
- `npm run connections:clean` - Remove all Hookdeck connections and sources (useful for reset)
- `npm run test:chargebee-auth` - Test Chargebee API authentication

## Webhook Endpoints

The application provides three focused webhook endpoints:

### `/webhooks/chargebee/customer`

Handles customer-related events:

- `customer_created` - New customer registration
- `customer_changed` - Customer profile updates

### `/webhooks/chargebee/subscription`

Handles subscription lifecycle events:

- `subscription_created` - New subscription provisioning
- `subscription_renewed` - Subscription renewal
- `subscription_changed` - Plan changes and updates

### `/webhooks/chargebee/payments`

Handles payment events:

- `payment_succeeded` - Successful payment processing

Each endpoint logs relevant event details and includes TODO comments for implementing business logic.

## Health Check

The application includes a health check endpoint at `/health` (no authentication required):

```bash
curl http://localhost:4000/health
```

## License

MIT
