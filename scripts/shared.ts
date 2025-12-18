// Shared types and utilities for Hookdeck scripts
import { WebhookEventType } from "chargebee";

// Types
export type Mode = "dev" | "prod";

export interface Source {
  name: string;
  type: string;
  config: {
    auth: {
      username: string;
      password: string;
    };
  };
}

export interface Destination {
  name: string;
  type: string;
  config: {
    path?: string;
    url?: string;
  };
}

export interface HookdeckConnection {
  name: string;
  source?: Source;
  source_id?: string;
  destination: Destination;
  rules?: Array<{
    type: "filter";
    headers?: Record<string, any>;
    body?: Record<string, any>;
    query?: Record<string, any>;
  }>;
}

export interface HookdeckConnectionResponse {
  id: string;
  name: string;
  source: Source & {
    id: string;
    url: string;
  };
  destination: Destination & {
    id: string;
  };
}

export interface HookdeckSource {
  id: string;
  name: string;
  url: string;
}

export interface HookdeckDestination {
  id: string;
  name: string;
  url?: string;
  cli_path?: string;
}

// Essential event types for tutorial examples
export const ESSENTIAL_WEBHOOK_EVENTS = [
  "customer_created",
  "customer_changed",
  "subscription_created",
  "subscription_renewed",
  "subscription_changed",
  "payment_succeeded",
] as const;

// Complete list of webhook events used in production
export const ALL_WEBHOOK_EVENTS = [
  // Customer events
  WebhookEventType.CustomerCreated,
  WebhookEventType.CustomerChanged,
  WebhookEventType.CustomerDeleted,
  WebhookEventType.CustomerMovedIn,
  WebhookEventType.CustomerMovedOut,
  // Subscription events
  WebhookEventType.SubscriptionCreated,
  WebhookEventType.SubscriptionStarted,
  WebhookEventType.SubscriptionActivated,
  WebhookEventType.SubscriptionChanged,
  WebhookEventType.SubscriptionCancelled,
  WebhookEventType.SubscriptionReactivated,
  WebhookEventType.SubscriptionRenewed,
  WebhookEventType.SubscriptionScheduledCancellationRemoved,
  WebhookEventType.SubscriptionChangesScheduled,
  WebhookEventType.SubscriptionScheduledChangesRemoved,
  WebhookEventType.SubscriptionShippingAddressUpdated,
  WebhookEventType.SubscriptionDeleted,
  WebhookEventType.SubscriptionResumed,
  WebhookEventType.SubscriptionPaused,
  // Payment events
  WebhookEventType.PaymentSucceeded,
] as const;

// Utility functions
export function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function makeHttpRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: any,
  contentType: "json" | "form" = "json",
): Promise<any> {
  let requestBody: string | undefined;
  let requestHeaders = { ...headers };

  if (body) {
    if (contentType === "form") {
      // Convert object to URL-encoded form data
      const formData = new URLSearchParams();
      const flattenObject = (obj: any, prefix = "") => {
        for (const key in obj) {
          const value = obj[key];
          const formKey = prefix ? `${prefix}[${key}]` : key;

          if (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
          ) {
            flattenObject(value, formKey);
          } else if (Array.isArray(value)) {
            value.forEach((item) => {
              formData.append(`${formKey}[]`, item);
            });
          } else {
            formData.append(formKey, value);
          }
        }
      };
      flattenObject(body);
      requestBody = formData.toString();
      requestHeaders["Content-Type"] = "application/x-www-form-urlencoded";
    } else {
      requestBody = JSON.stringify(body);
      requestHeaders["Content-Type"] = "application/json";
    }
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: requestBody,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

// Project-specific resource names
export const PROJECT_SOURCE_NAME = "chargebee";

export const PROJECT_CONNECTION_NAMES = {
  customer: "chargebee-customer",
  subscription: "chargebee-subscription",
  payment: "chargebee-payment",
} as const;

export const PROJECT_DESTINATION_NAMES = {
  customer: "chargebee-customer-handler",
  subscription: "chargebee-subscription-handler",
  payment: "chargebee-payment-handler",
} as const;
