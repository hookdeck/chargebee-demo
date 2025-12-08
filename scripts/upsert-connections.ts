#!/usr/bin/env ts-node

import * as dotenv from "dotenv";
import chargebee from "chargebee";
import {
  Mode,
  Source,
  HookdeckConnection,
  HookdeckConnectionResponse,
  HookdeckSource,
  ChargebeeWebhookEndpoint,
  getEnvVar,
  makeHttpRequest,
  PROJECT_SOURCE_NAME,
  PROJECT_CONNECTION_NAMES,
  PROJECT_DESTINATION_NAMES,
  ALL_WEBHOOK_EVENTS,
} from "./shared";

dotenv.config();

// Initialize Chargebee SDK
chargebee.configure({
  site: getEnvVar("CHARGEBEE_SITE"),
  api_key: getEnvVar("CHARGEBEE_API_KEY"),
});

// Hookdeck API functions
async function upsertHookdeckSource(
  apiKey: string,
  source: Source,
): Promise<HookdeckSource> {
  console.log(`  Upserting source: ${source.name}`);

  const response = await makeHttpRequest(
    "https://api.hookdeck.com/2025-07-01/sources",
    "PUT",
    {
      Authorization: `Bearer ${apiKey}`,
    },
    source,
  );

  if (!response.url) {
    throw new Error(
      `Source response missing URL. Response: ${JSON.stringify(response)}`,
    );
  }

  return response;
}

async function upsertHookdeckConnection(
  apiKey: string,
  connection: HookdeckConnection,
): Promise<HookdeckConnectionResponse> {
  console.log(`   Upserting connection: ${connection.name}`);

  const response = await makeHttpRequest(
    "https://api.hookdeck.com/2025-07-01/connections",
    "PUT",
    {
      Authorization: `Bearer ${apiKey}`,
    },
    connection,
  );

  return response;
}

// Chargebee API functions
async function getChargebeeWebhookEndpoints(): Promise<
  ChargebeeWebhookEndpoint[]
> {
  console.log("   Fetching existing Chargebee webhook endpoints...");

  try {
    const result = await chargebee.webhook_endpoint.list().request();
    return result.list.map((item: any) => item.webhook_endpoint) || [];
  } catch (err) {
    console.error("  Failed to fetch webhook endpoints:", err);
    return [];
  }
}

async function updateChargebeeWebhookEndpoint(
  endpointId: string,
  webhookUrl: string,
  username: string,
  password: string,
): Promise<void> {
  console.log("   Updating Chargebee webhook endpoint...");

  await chargebee.webhook_endpoint
    .update(endpointId, {
      url: webhookUrl,
      api_version: "v2",
      basic_auth_username: username,
      basic_auth_password: password,
      enabled_events: [...ALL_WEBHOOK_EVENTS] as any,
    })
    .request();
}

async function createChargebeeWebhookEndpoint(
  webhookUrl: string,
  username: string,
  password: string,
): Promise<void> {
  console.log("   Creating Chargebee webhook endpoint...");

  await chargebee.webhook_endpoint
    .create({
      name: "Hookdeck Webhook Endpoint",
      url: webhookUrl,
      api_version: "v2",
      basic_auth_username: username,
      basic_auth_password: password,
      enabled_events: [...ALL_WEBHOOK_EVENTS] as any,
    })
    .request();
}

// Main script logic
async function setupHookdeckConnections(mode: Mode): Promise<string> {
  console.log(
    `\n🔧 Setting up Hookdeck Event Gateway connections in ${mode.toUpperCase()} mode...\n`,
  );

  // Get Hookdeck API key
  const apiKey = getEnvVar("HOOKDECK_API_KEY");

  // Source configuration
  const sourceName = PROJECT_SOURCE_NAME;

  // Create the source first
  console.log("Creating Hookdeck source...");
  const sourceResponse = await upsertHookdeckSource(apiKey, {
    name: sourceName,
    type: "CHARGEBEE_BILLING",
    config: {
      auth: {
        username: getEnvVar("CHARGEBEE_WEBHOOK_USERNAME"),
        password: getEnvVar("CHARGEBEE_WEBHOOK_PASSWORD"),
      },
    },
  });

  const hookdeckSourceUrl = sourceResponse.url;
  const hookdeckSourceId = sourceResponse.id;

  console.log(`  📍 Hookdeck Source URL: ${hookdeckSourceUrl}`);
  console.log(`  🆔 Hookdeck Source ID: ${hookdeckSourceId}`);

  if (!hookdeckSourceUrl) {
    throw new Error(
      `Source URL is undefined. Full response: ${JSON.stringify(sourceResponse)}`,
    );
  }

  console.log();

  // Helper function to create destination config
  const createDestination = (name: string, path: string) => ({
    name,
    type: mode === "dev" ? "CLI" : "HTTP",
    config: {
      ...(mode === "dev"
        ? { path }
        : { url: `${getEnvVar("PROD_DESTINATION_URL")}${path}` }),
    },
  });

  // Connection configurations with filter rules (now just referencing the source by id)
  const connections: HookdeckConnection[] = [
    {
      name: PROJECT_CONNECTION_NAMES.customer,
      source_id: hookdeckSourceId,
      destination: createDestination(
        PROJECT_DESTINATION_NAMES.customer,
        "/webhooks/chargebee/customer",
      ),
      rules: [
        {
          type: "filter",
          body: {
            event_type: {
              $startsWith: "customer_",
            },
          },
        },
      ],
    },
    {
      name: PROJECT_CONNECTION_NAMES.subscription,
      source_id: hookdeckSourceId,
      destination: createDestination(
        PROJECT_DESTINATION_NAMES.subscription,
        "/webhooks/chargebee/subscription",
      ),
      rules: [
        {
          type: "filter",
          body: {
            event_type: {
              $startsWith: "subscription_",
            },
          },
        },
      ],
    },
    {
      name: PROJECT_CONNECTION_NAMES.payment,
      source_id: hookdeckSourceId,
      destination: createDestination(
        PROJECT_DESTINATION_NAMES.payment,
        "/webhooks/chargebee/payments",
      ),
      rules: [
        {
          type: "filter",
          body: {
            event_type: {
              $eq: "payment_succeeded",
            },
          },
        },
      ],
    },
  ];

  // Create connections (now they just reference the source by name)
  console.log("Creating Hookdeck connections...");

  for (const connection of connections) {
    await upsertHookdeckConnection(apiKey, connection);
  }

  console.log("✅ Hookdeck connections created successfully!\n");

  return hookdeckSourceUrl;
}

async function setupChargebeeWebhook(
  mode: Mode,
  hookdeckSourceUrl: string,
): Promise<void> {
  console.log(
    `\n🔧 Setting up Chargebee webhook in ${mode.toUpperCase()} mode...\n`,
  );

  const webhookUsername = getEnvVar("CHARGEBEE_WEBHOOK_USERNAME");
  const webhookPassword = getEnvVar("CHARGEBEE_WEBHOOK_PASSWORD");

  // Check if webhook endpoint already exists
  console.log("Checking for existing webhook endpoints...");
  const existingEndpoints = await getChargebeeWebhookEndpoints();

  // Look for an existing endpoint with the name "Hookdeck Webhook Endpoint"
  const hookdeckEndpoint = existingEndpoints.find(
    (endpoint) => endpoint.name === "Hookdeck Webhook Endpoint",
  );

  if (hookdeckEndpoint) {
    // Update existing endpoint
    console.log("   Webhook endpoint already exists. Updating...");
    await updateChargebeeWebhookEndpoint(
      hookdeckEndpoint.id,
      hookdeckSourceUrl,
      webhookUsername,
      webhookPassword,
    );
    console.log("✅ Chargebee webhook updated successfully!\n");
  } else {
    // Create new webhook endpoint
    await createChargebeeWebhookEndpoint(
      hookdeckSourceUrl,
      webhookUsername,
      webhookPassword,
    );
    console.log("✅ Chargebee webhook created successfully!\n");
  }
}

async function main(): Promise<void> {
  // Parse command-line arguments
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("❌ Error: Mode argument required (dev or prod)");
    console.error("Usage: ts-node scripts/upsert-connections.ts <dev|prod>");
    process.exit(1);
  }

  const mode = args[0].toLowerCase();

  if (mode !== "dev" && mode !== "prod") {
    console.error('❌ Error: Invalid mode. Must be "dev" or "prod"');
    process.exit(1);
  }

  try {
    const hookdeckSourceUrl = await setupHookdeckConnections(mode as Mode);
    await setupChargebeeWebhook(mode as Mode, hookdeckSourceUrl);

    console.log("🎉 All configurations completed successfully!\n");
  } catch (error) {
    console.error("\n❌ Error during setup:", error);
    process.exit(1);
  }
}

// Run the script
main();
