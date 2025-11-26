#!/usr/bin/env ts-node

import * as dotenv from "dotenv";
import * as readline from "readline";
import {
  HookdeckConnectionResponse,
  HookdeckSource,
  HookdeckDestination,
  getEnvVar,
  makeHttpRequest,
  PROJECT_SOURCE_NAME,
  PROJECT_CONNECTION_NAMES,
  PROJECT_DESTINATION_NAMES,
} from "./shared";

dotenv.config();

async function confirmAction(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "yes" || answer.toLowerCase() === "y");
    });
  });
}

// Hookdeck API functions
async function listHookdeckConnections(
  apiKey: string,
): Promise<HookdeckConnectionResponse[]> {
  console.log("Fetching all Hookdeck connections...");

  const response = await makeHttpRequest(
    "https://api.hookdeck.com/2025-07-01/connections",
    "GET",
    {
      Authorization: `Bearer ${apiKey}`,
    },
  );

  return response.models || [];
}

async function deleteHookdeckConnection(
  apiKey: string,
  connectionId: string,
): Promise<void> {
  await makeHttpRequest(
    `https://api.hookdeck.com/2025-07-01/connections/${connectionId}`,
    "DELETE",
    {
      Authorization: `Bearer ${apiKey}`,
    },
  );
}

async function listHookdeckSources(apiKey: string): Promise<HookdeckSource[]> {
  console.log("Fetching all Hookdeck sources...");

  const response = await makeHttpRequest(
    "https://api.hookdeck.com/2025-07-01/sources",
    "GET",
    {
      Authorization: `Bearer ${apiKey}`,
    },
  );

  return response.models || [];
}

async function deleteHookdeckSource(
  apiKey: string,
  sourceId: string,
): Promise<void> {
  await makeHttpRequest(
    `https://api.hookdeck.com/2025-07-01/sources/${sourceId}`,
    "DELETE",
    {
      Authorization: `Bearer ${apiKey}`,
    },
  );
}

async function listHookdeckDestinations(
  apiKey: string,
): Promise<HookdeckDestination[]> {
  console.log("Fetching all Hookdeck destinations...");

  const response = await makeHttpRequest(
    "https://api.hookdeck.com/2025-07-01/destinations",
    "GET",
    {
      Authorization: `Bearer ${apiKey}`,
    },
  );

  return response.models || [];
}

async function deleteHookdeckDestination(
  apiKey: string,
  destinationId: string,
): Promise<void> {
  await makeHttpRequest(
    `https://api.hookdeck.com/2025-07-01/destinations/${destinationId}`,
    "DELETE",
    {
      Authorization: `Bearer ${apiKey}`,
    },
  );
}

// Main script logic
async function main(): Promise<void> {
  console.log("\n🧹 Hookdeck Connection Cleanup Script\n");

  try {
    const apiKey = getEnvVar("HOOKDECK_API_KEY");

    // List all connections and filter to project-specific ones
    const allConnections = await listHookdeckConnections(apiKey);
    const projectConnectionNames = Object.values(
      PROJECT_CONNECTION_NAMES,
    ) as string[];
    const connections = allConnections.filter((conn) =>
      projectConnectionNames.includes(conn.name),
    );

    if (connections.length === 0) {
      console.log("✅ No connections found.\n");
    } else {
      console.log(`\nFound ${connections.length} connection(s):\n`);
      connections.forEach((conn, index) => {
        console.log(`  ${index + 1}. ${conn.name} (ID: ${conn.id})`);
        console.log(`     Source: ${conn.source.name}`);
        console.log(`     Destination: ${conn.destination.name}\n`);
      });

      // Ask for confirmation
      const confirmDelete = await confirmAction(
        `⚠️  Do you want to delete all ${connections.length} connection(s)? (yes/no): `,
      );

      if (!confirmDelete) {
        console.log("\n❌ Connection deletion cancelled by user.\n");
      } else {
        // Delete all connections
        console.log("\n🗑️  Deleting connections...\n");
        for (const conn of connections) {
          console.log(`  Deleting connection: ${conn.name} (${conn.id})`);
          await deleteHookdeckConnection(apiKey, conn.id);
        }

        console.log("\n✅ All connections deleted successfully!\n");
      }
    }

    // Now handle sources and filter to project-specific ones
    const allSources = await listHookdeckSources(apiKey);
    const sources = allSources.filter(
      (source) => source.name === PROJECT_SOURCE_NAME,
    );

    if (sources.length === 0) {
      console.log("✅ No sources found.\n");
    } else {
      console.log(`\nFound ${sources.length} source(s):\n`);
      sources.forEach((source, index) => {
        console.log(`  ${index + 1}. ${source.name} (ID: ${source.id})`);
        console.log(`     URL: ${source.url}\n`);
      });

      // Ask for confirmation to delete sources
      const confirmDeleteSources = await confirmAction(
        `⚠️  Do you want to delete all ${sources.length} source(s)? (yes/no): `,
      );

      if (!confirmDeleteSources) {
        console.log("\n⚠️  Sources preserved.\n");
      } else {
        // Delete all sources
        console.log("\n🗑️  Deleting sources...\n");
        for (const source of sources) {
          console.log(`  Deleting source: ${source.name} (${source.id})`);
          await deleteHookdeckSource(apiKey, source.id);
        }

        console.log("\n✅ All sources deleted successfully!\n");
      }
    }

    // Finally handle destinations and filter to project-specific ones
    const allDestinations = await listHookdeckDestinations(apiKey);
    const projectDestinationNames = Object.values(
      PROJECT_DESTINATION_NAMES,
    ) as string[];
    const destinations = allDestinations.filter((dest) =>
      projectDestinationNames.includes(dest.name),
    );

    if (destinations.length === 0) {
      console.log("✅ No destinations found. Cleanup complete.\n");
      console.log("🎉 Complete cleanup finished!\n");
      return;
    }

    console.log(`\nFound ${destinations.length} destination(s):\n`);
    destinations.forEach((dest, index) => {
      console.log(`  ${index + 1}. ${dest.name} (ID: ${dest.id})`);
      if (dest.url) {
        console.log(`     URL: ${dest.url}\n`);
      } else if (dest.cli_path) {
        console.log(`     CLI Path: ${dest.cli_path}\n`);
      } else {
        console.log("");
      }
    });

    // Ask for confirmation to delete destinations
    const confirmDeleteDestinations = await confirmAction(
      `⚠️  Do you want to delete all ${destinations.length} destination(s)? (yes/no): `,
    );

    if (!confirmDeleteDestinations) {
      console.log("\n⚠️  Destinations preserved. Cleanup complete.\n");
      console.log("🎉 Complete cleanup finished!\n");
      return;
    }

    // Delete all destinations
    console.log("\n🗑️  Deleting destinations...\n");
    for (const dest of destinations) {
      console.log(`  Deleting destination: ${dest.name} (${dest.id})`);
      await deleteHookdeckDestination(apiKey, dest.id);
    }

    console.log("\n✅ All destinations deleted successfully!\n");
    console.log("🎉 Complete cleanup finished!\n");
  } catch (error) {
    console.error("\n❌ Error during cleanup:", error);
    process.exit(1);
  }
}

// Run the script
main();
