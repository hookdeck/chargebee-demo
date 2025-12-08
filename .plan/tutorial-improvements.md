# Tutorial Improvements Plan

## Overview

This document provides a comprehensive implementation plan for addressing feedback on the Chargebee + Hookdeck Event Gateway demo and tutorial. The plan covers three main areas:

1. **SDK Migration** - Replace fetch calls with Chargebee Node.js SDK
2. **Branding Updates** - Replace "Chargebee Billing" with "Chargebee"
3. **Tutorial Shortening** - Remove redundant sections and condense content

---

## 1. SDK MIGRATION - Replace Fetch with Chargebee Node.js SDK

### Current Implementation Analysis

The project makes Chargebee API calls in **one file only**: `scripts/upsert-connections.ts`

Three functions use native `fetch` with manual authentication:

#### **Function 1: `getChargebeeWebhookEndpoints()` (Lines 65-88)**

**Current implementation:**

```typescript
async function getChargebeeWebhookEndpoints(
  apiKey: string,
  siteName: string,
): Promise<ChargebeeWebhookEndpoint[]> {
  console.log("   Fetching existing Chargebee webhook endpoints...");

  const auth = Buffer.from(`${apiKey}:`).toString("base64");

  try {
    const response = await makeHttpRequest(
      `https://${siteName}.chargebee.com/api/v2/webhook_endpoints`,
      "GET",
      {
        Authorization: `Basic ${auth}`,
      },
      undefined,
      "json",
    );

    return response.list?.map((item: any) => item.webhook_endpoint) || [];
  } catch (err) {
    console.error("  Failed to fetch webhook endpoints:", err);
    return [];
  }
}
```

**Proposed SDK replacement:**

```typescript
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
```

**Changes:**

- Remove manual Base64 authentication
- Remove `apiKey` and `siteName` parameters (configured once at initialization)
- Use `chargebee.webhook_endpoint.list().request()`
- Simplified error handling

---

#### **Function 2: `updateChargebeeWebhookEndpoint()` (Lines 91-131)**

**Current implementation:**

```typescript
async function updateChargebeeWebhookEndpoint(
  apiKey: string,
  siteName: string,
  endpointId: string,
  webhookUrl: string,
  username: string,
  password: string,
): Promise<void> {
  console.log("   Updating Chargebee webhook endpoint...");

  const auth = Buffer.from(`${apiKey}:`).toString("base64");
  const eventTypes = [...ALL_WEBHOOK_EVENTS];

  const params = new URLSearchParams({
    url: webhookUrl,
    api_version: "v2",
    basic_auth_username: username,
    basic_auth_password: password,
  });

  eventTypes.forEach((event, index) => {
    params.append(`enabled_events[${index}]`, event);
  });

  const response = await fetch(
    `https://${siteName}.chargebee.com/api/v2/webhook_endpoints/${endpointId}`,
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

**Proposed SDK replacement:**

```typescript
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
      enabled_events: [...ALL_WEBHOOK_EVENTS],
    })
    .request();
}
```

**Changes:**

- Remove `apiKey` and `siteName` parameters
- Remove manual URLSearchParams construction
- Remove manual Base64 authentication
- Use `chargebee.webhook_endpoint.update()`
- SDK handles error responses automatically

---

#### **Function 3: `createChargebeeWebhookEndpoint()` (Lines 133-173)**

**Current implementation:**

```typescript
async function createChargebeeWebhookEndpoint(
  apiKey: string,
  siteName: string,
  webhookUrl: string,
  username: string,
  password: string,
): Promise<void> {
  console.log("   Creating Chargebee webhook endpoint...");

  const auth = Buffer.from(`${apiKey}:`).toString("base64");
  const eventTypes = [...ALL_WEBHOOK_EVENTS];

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

**Proposed SDK replacement:**

```typescript
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
      enabled_events: [...ALL_WEBHOOK_EVENTS],
    })
    .request();
}
```

**Changes:**

- Remove `apiKey` and `siteName` parameters
- Remove manual URLSearchParams construction
- Remove manual Base64 authentication
- Use `chargebee.webhook_endpoint.create()`
- SDK handles error responses automatically

---

### SDK Initialization

Add at the top of `scripts/upsert-connections.ts` (after imports):

```typescript
import * as chargebee from "chargebee";

// Initialize Chargebee SDK
chargebee.configure({
  site: getEnvVar("CHARGEBEE_SITE"),
  api_key: getEnvVar("CHARGEBEE_API_KEY"),
});
```

---

### Function Call Updates

Update all function calls to remove `apiKey` and `siteName` parameters:

**Line 310-313 (in `setupChargebeeWebhook()`):**

```typescript
// OLD
const existingEndpoints = await getChargebeeWebhookEndpoints(
  chargebeeApiKey,
  chargebeeSite,
);

// NEW
const existingEndpoints = await getChargebeeWebhookEndpoints();
```

**Line 323-330 (update call):**

```typescript
// OLD
await updateChargebeeWebhookEndpoint(
  chargebeeApiKey,
  chargebeeSite,
  hookdeckEndpoint.id,
  hookdeckSourceUrl,
  webhookUsername,
  webhookPassword,
);

// NEW
await updateChargebeeWebhookEndpoint(
  hookdeckEndpoint.id,
  hookdeckSourceUrl,
  webhookUsername,
  webhookPassword,
);
```

**Line 334-340 (create call):**

```typescript
// OLD
await createChargebeeWebhookEndpoint(
  chargebeeApiKey,
  chargebeeSite,
  hookdeckSourceUrl,
  webhookUsername,
  webhookPassword,
);

// NEW
await createChargebeeWebhookEndpoint(
  hookdeckSourceUrl,
  webhookUsername,
  webhookPassword,
);
```

---

### Dependencies

**Add to `package.json`:**

```json
{
  "dependencies": {
    "chargebee": "^2.35.0"
  }
}
```

**Note:** Check [npm](https://www.npmjs.com/package/chargebee) for latest version.

---

### Tutorial Updates

**File: `docs/tutorial.md`**

**Lines 159-209** - Update the code example in "Creating the Webhook Endpoint" section:

Replace the current fetch-based example with SDK-based example:

```typescript
import * as chargebee from "chargebee";

// Initialize the SDK (one-time setup)
chargebee.configure({
  site: siteName,
  api_key: apiKey,
});

async function createChargebeeWebhookEndpoint(
  webhookUrl: string,
  username: string,
  password: string,
): Promise<void> {
  // List of webhook events to subscribe to
  const eventTypes = [
    "customer_created",
    "customer_changed",
    "subscription_created",
    "subscription_renewed",
    "subscription_changed",
    "payment_succeeded",
  ];

  await chargebee.webhook_endpoint
    .create({
      name: "Hookdeck Webhook Endpoint",
      url: webhookUrl,
      api_version: "v2",
      basic_auth_username: username,
      basic_auth_password: password,
      enabled_events: eventTypes,
    })
    .request();
}
```

The full script also checks for existing endpoints and updates them instead of creating duplicates.

---

## 2. BRANDING UPDATES - Replace "Chargebee Billing"

### All References (7 total)

| File               | Line | Current Text                                    | Replacement                             |
| ------------------ | ---- | ----------------------------------------------- | --------------------------------------- |
| `README.md`        | 1    | "Chargebee Billing Hookdeck Event Gateway Demo" | "Chargebee Hookdeck Event Gateway Demo" |
| `README.md`        | 7    | "Chargebee Billing" (with link)                 | "Chargebee" (keep link)                 |
| `docs/tutorial.md` | 1    | "Chargebee Billing Webhooks"                    | "Chargebee Webhooks"                    |
| `docs/tutorial.md` | 3    | "Chargebee Billing webhooks"                    | "Chargebee webhooks"                    |
| `docs/tutorial.md` | 18   | "Chargebee Billing Hookdeck demo"               | "Chargebee Hookdeck demo"               |
| `docs/tutorial.md` | 155  | "Chargebee Billing Webhook Endpoint"            | "Chargebee Webhook Endpoint"            |
| `docs/tutorial.md` | 214  | "Chargebee Billing webhook events"              | "Chargebee webhook events"              |
| `docs/tutorial.md` | 698  | "Chargebee Billing with Hookdeck"               | "Chargebee with Hookdeck"               |

### Implementation

Simple find-and-replace operation:

- Find: `Chargebee Billing`
- Replace: `Chargebee`
- Files: `README.md`, `docs/tutorial.md`

**Important:** Do NOT change line 192 in `scripts/upsert-connections.ts`:

```typescript
type: "CHARGEBEE_BILLING"; // This is a Hookdeck API constant
```

---

## 3. TUTORIAL SHORTENING

### Current Tutorial Structure (706 lines)

**Breakdown by section:**

| Section                              | Lines       | Length  |
| ------------------------------------ | ----------- | ------- |
| Introduction & Prerequisites         | 1-54        | 54      |
| Architecture Overview                | 55-64       | 10      |
| Programmatic Infrastructure Setup    | 65-70       | 6       |
| Step 1 — Create Hookdeck Connections | 71-154      | 84      |
| Step 2 — Create Chargebee Webhook    | 155-237     | 83      |
| Step 3 — Implement Handlers          | 238-493     | 256     |
| &nbsp;&nbsp;- Express Setup          |             | 30      |
| &nbsp;&nbsp;- Customer Handler       |             | 45      |
| &nbsp;&nbsp;- Subscription Handler   |             | 52      |
| &nbsp;&nbsp;- Payment Handler        |             | 42      |
| &nbsp;&nbsp;- **Idempotency**        |             | **77**  |
| Step 4 — Testing                     | 494-595     | 102     |
| Step 5 — Production Deployment       | 596-673     | 78      |
| **Tips & Best Practices**            | **674-687** | **14**  |
| Conclusion                           | 688-706     | 19      |
| **TOTAL**                            |             | **706** |

---

### Recommended Changes

#### **A. Remove: "Tips & Best Practices" Section (Lines 674-687)**

**Rationale:**

- All content is redundant with earlier sections
- Idempotency: Extensively covered in Step 3 (lines 416-493)
- Monitoring: Referenced throughout
- Delivery Rate Management: Advanced topic not needed for basic tutorial
- Event Retries: Covered in Step 4 troubleshooting
- Testing: Entire Step 4 covers this

**Lines to remove:** 674-687 (14 lines)

**Impact:** Eliminates redundancy without losing information

---

#### **B. Remove: Detailed Idempotency Implementation (Lines 422-493)**

**Current:** 72 lines of detailed database implementation with:

- Complete code example with try/catch
- Database operations
- Race condition handling
- SQL schema definition
- Cleanup logic

**Rationale:**

- Too implementation-specific for a tutorial
- Different projects use different databases
- The detailed code overwhelms the main tutorial flow
- Basic concept explanation (lines 416-421) is sufficient
- Users need to adapt to their own stack anyway

**Proposed replacement:**

Keep lines 416-421 (concept explanation), then add brief note:

```markdown
### Idempotency

You are responsible for implementing idempotency in your handlers. Use the event `id` field to track which events you've already processed. Store processed event IDs to ensure operations like provisioning access or charging customers happen exactly once per event.

While the Event Gateway can reduce duplicate delivery through its [deduplication feature](https://hookdeck.com/docs/deduplication?ref=chargebee), it doesn't eliminate the need for handler-level deduplication. Network issues or application restarts can cause the same event to be delivered multiple times.

**Implementation approaches:**

1. **Database-backed tracking**: Store processed event IDs in a database table with a unique constraint
2. **Redis/cache-based**: Use Redis with TTL for temporary deduplication
3. **Application state**: For stateless handlers, use external state management

The specific implementation depends on your technology stack and requirements. See the [Event Gateway best practices](https://hookdeck.com/docs/best-practices?ref=chargebee) for detailed patterns.
```

**Lines to remove:** 422-493 (72 lines)

**Impact:** Keeps tutorial focused on webhook integration, not database patterns

---

#### **C. Shorten: Production Deployment (Lines 596-673)**

**Current:** 78 lines covering:

- Running production setup (lines 596-617) - 22 lines
- Initial production deployment (lines 618-628) - 11 lines
- Separate test/production environments (lines 630-662) - 33 lines
- Verification (lines 663-673) - 11 lines

**Proposed condensing:**

**Lines 618-628** (Initial Production Deployment) - Reduce to 3-4 lines:

```markdown
### Quick Production Setup

For your first production deployment, use the same Hookdeck project and Chargebee site as development:

1. Set `PROD_DESTINATION_URL` to your production server URL
2. Run `npm run connections:upsert:prod` to update Connection destinations
```

**Lines 630-662** (Separate Environments) - Move advanced content to appendix or reference:

```markdown
### Multiple Environment Setup

For ongoing development, set up separate Hookdeck projects and Chargebee sites for test and production environments. This prevents test events from mixing with production data and allows safe testing of breaking changes.

See the [Hookdeck Projects documentation](https://hookdeck.com/docs/projects?ref=chargebee) for guidance on creating separate projects for development, staging, and production.
```

**Estimated new length:** ~35 lines (reduce by 43 lines)

**Rationale:**

- Users following tutorial need basic deployment
- Advanced multi-environment setup is valuable but makes tutorial too long
- Can reference Hookdeck docs for environment strategies
- Keeps tutorial action-oriented

---

#### **D. Shorten: Testing Section (Lines 494-595)**

**Current:** 102 lines with:

- Start Application (lines 498-505) - 8 lines
- Install/Auth CLI (lines 506-520) - 15 lines
- CLI output example (lines 521-537) - 17 lines
- Triggering test events (lines 539-546) - 8 lines
- Verifying delivery (lines 547-565) - 19 lines
- What success looks like (lines 566-576) - 11 lines
- **CLI inspection/retry** (lines 577-585) - **9 lines** ← condense
- **Troubleshooting** (lines 587-595) - **9 lines** ← condense

**Proposed changes:**

**Lines 577-585** (CLI Inspection) - Reduce to 2-3 lines:

```markdown
### Inspecting and Retrying Events

The Hookdeck CLI provides interactive event inspection and retry capabilities. Navigate events with keyboard shortcuts, press `d` to inspect payloads, and `r` to retry events. See the [CLI documentation](https://hookdeck.com/docs/cli?ref=chargebee) for full details.
```

**Lines 587-595** (Troubleshooting) - Keep only top 3 issues:

```markdown
### Troubleshooting

Common issues:

- **Event not reaching Event Gateway**: Verify webhook URL and Basic Auth credentials match between Chargebee and Event Gateway
- **Event not routed**: Check Connection filter rules match your event types
- **Handler errors**: Check application logs for error messages and verify payload structure
```

**Estimated new length:** ~75 lines (reduce by 27 lines)

**Rationale:**

- Detailed CLI usage belongs in CLI docs
- Tutorial should focus on integration, not tool mastery
- Keep troubleshooting concise and actionable

---

#### **E. Condense: Handler Examples (Lines 280-415)**

**Current:** 136 lines with three similar handlers

**Issues:**

- Each handler shows same pattern
- TODO comments repeated 3 times per handler (6 total)
- Verbose console.log examples

**Proposed approach:**

1. **Show one complete handler** (Customer) with full detail
2. **Summarize the other two** with code structure only
3. **Remove redundant TODO comments** - mention once
4. **Reduce console.log examples**

**Example condensed pattern:**

```markdown
### Customer Handler

The customer handler processes profile creation and updates in `src/handlers/customer.ts`:

[Show complete customer handler code - ~30 lines]

### Subscription and Payment Handlers

The subscription and payment handlers follow the same pattern:

**Subscription Handler** (`src/handlers/subscription.ts`):

- Handles `subscription_created`, `subscription_renewed`, `subscription_changed`
- Provisions access, extends renewals, updates entitlements
- See full implementation in repository

**Payment Handler** (`src/handlers/payments.ts`):

- Handles `payment_succeeded` events
- Tracks revenue, confirms renewals, updates billing status
- See full implementation in repository

**Note:** All handlers should implement idempotency by tracking processed event IDs (covered in the Idempotency section above).
```

**Estimated new length:** ~106 lines (reduce by 30 lines)

**Rationale:**

- Pattern is clear after one detailed example
- Reduces repetition without losing concepts
- Keeps tutorial moving forward

---

### Summary of Tutorial Reduction

| Change                        | Current Lines | Proposed Lines | Reduction       |
| ----------------------------- | ------------- | -------------- | --------------- |
| Remove Tips & Best Practices  | 14            | 0              | **-14**         |
| Remove Detailed Idempotency   | 72            | 0              | **-72**         |
| Shorten Production Deployment | 78            | 35             | **-43**         |
| Shorten Testing               | 102           | 75             | **-27**         |
| Condense Handler Examples     | 136           | 106            | **-30**         |
| **TOTAL**                     | **706**       | **~520**       | **~186 (-26%)** |

---

## 4. IMPLEMENTATION PHASES

### Phase 1: SDK Migration (Highest Priority)

**Estimated effort:** 2-3 hours

1. ✓ Install chargebee npm package
2. ✓ Add SDK initialization to `scripts/upsert-connections.ts`
3. ✓ Update `getChargebeeWebhookEndpoints()` function
4. ✓ Update `updateChargebeeWebhookEndpoint()` function
5. ✓ Update `createChargebeeWebhookEndpoint()` function
6. ✓ Update all function calls to remove apiKey/siteName params
7. ✓ Test script execution with real Chargebee API
8. ✓ Update tutorial code examples in `docs/tutorial.md` (lines 159-215)

**Testing:**

- Run `npm run connections:upsert:dev`
- Verify webhook endpoint is created/updated in Chargebee
- Verify connections are created in Hookdeck

---

### Phase 2: Branding Updates (Quick Win)

**Estimated effort:** 15 minutes

1. ✓ Find-replace "Chargebee Billing" → "Chargebee" in `README.md`
2. ✓ Find-replace "Chargebee Billing" → "Chargebee" in `docs/tutorial.md`
3. ✓ Verify line 192 in `scripts/upsert-connections.ts` is NOT changed
4. ✓ Review all changes

**Testing:**

- Search for remaining "Chargebee Billing" occurrences
- Verify no API constants were changed

---

### Phase 3: Tutorial Shortening (Most Complex)

**Estimated effort:** 3-4 hours

**Order of operations:**

1. ✓ Remove Tips & Best Practices (lines 674-687)
2. ✓ Replace detailed idempotency implementation (lines 422-493)
3. ✓ Shorten production deployment section (lines 618-662)
4. ✓ Shorten testing section CLI/troubleshooting (lines 577-595)
5. ✓ Condense handler examples (lines 280-415)
6. ✓ Review entire tutorial for flow and readability
7. ✓ Verify all internal links still work
8. ✓ Verify code examples are still complete and accurate

**Testing:**

- Read tutorial start to finish
- Verify no broken references
- Verify all steps are still actionable
- Check that condensed sections maintain clarity

---

## 5. TESTING REQUIREMENTS

### SDK Migration Testing

- [ ] `npm run connections:upsert:dev` succeeds
- [ ] Webhook endpoint created in Chargebee dashboard
- [ ] Webhook endpoint updated on re-run (idempotent)
- [ ] Basic Auth credentials are correct
- [ ] All event types are subscribed
- [ ] SDK error messages are clear

### Branding Testing

- [ ] No "Chargebee Billing" references in README
- [ ] No "Chargebee Billing" references in tutorial
- [ ] API constant `CHARGEBEE_BILLING` unchanged
- [ ] All Chargebee links still work

### Tutorial Testing

- [ ] Tutorial flows logically from start to finish
- [ ] All code examples are complete
- [ ] No broken internal references
- [ ] Shortened sections maintain clarity
- [ ] Reader can still accomplish all goals
- [ ] Length reduced by ~25%

---

## 6. FILES REQUIRING CHANGES

### Code Files

- `scripts/upsert-connections.ts` - SDK migration
- `package.json` - Add chargebee dependency

### Documentation Files

- `README.md` - Branding (2 changes)
- `docs/tutorial.md` - SDK examples, branding (6 changes), shortening (~186 lines)

### Files NOT Requiring Changes

- `src/handlers/*.ts` - No Chargebee API calls
- `scripts/shared.ts` - Generic utilities only
- `scripts/clean.ts` - Hookdeck API only
- All other project files

---

## 7. RISK MITIGATION

### SDK Migration Risks

- **Risk:** SDK behaves differently than fetch
- **Mitigation:** Test thoroughly with real API before committing

- **Risk:** SDK version incompatibility
- **Mitigation:** Use latest stable version, check changelog

### Tutorial Shortening Risks

- **Risk:** Removing too much context
- **Mitigation:** Keep all essential information, only remove redundancy

- **Risk:** Broken flow after condensing
- **Mitigation:** Full read-through after changes

---

## 8. SUCCESS CRITERIA

### SDK Migration Success

- ✓ All fetch calls replaced with SDK methods
- ✓ Authentication simplified (no manual Base64)
- ✓ Code is more maintainable
- ✓ Tutorial examples updated
- ✓ Script executes successfully

### Branding Success

- ✓ All "Chargebee Billing" references changed to "Chargebee"
- ✓ API constants unchanged
- ✓ Consistent branding throughout

### Tutorial Shortening Success

- ✓ Reduced by ~25% (186 lines)
- ✓ Maintains all essential information
- ✓ Flows logically
- ✓ No broken references
- ✓ Still actionable and complete

---

## 9. NOTES

### SDK Migration

- The Chargebee Node.js SDK uses a different pattern than REST fetch calls
- Configuration is one-time at application startup
- Error handling is more consistent
- Type safety is improved with TypeScript definitions

### Tutorial Philosophy

- Tutorials should be action-oriented
- Avoid deep dives into implementation details
- Link to external docs for advanced topics
- Show one complete example, summarize similar patterns
- Redundant content dilutes the main message

### Alignment with Style Guide

These changes align with the existing style guide (`.plan/outline.md`):

- "Show one runnable example at a time—avoid large code dumps" (line 80)
- Code examples 30-50 lines maximum (line 252)
- "Keep explanations crisp" (line 31)
- Practical, developer-focused tone (line 9)

---

## 10. IMPLEMENTATION CHECKLIST

Use this checklist when implementing:

### SDK Migration

- [ ] Install `chargebee` package
- [ ] Add SDK initialization
- [ ] Update `getChargebeeWebhookEndpoints()`
- [ ] Update `updateChargebeeWebhookEndpoint()`
- [ ] Update `createChargebeeWebhookEndpoint()`
- [ ] Update function calls
- [ ] Update tutorial code examples
- [ ] Test with real API

### Branding

- [ ] Replace in README.md (2 instances)
- [ ] Replace in docs/tutorial.md (6 instances)
- [ ] Verify API constants unchanged
- [ ] Search for any remaining references

### Tutorial Shortening

- [ ] Remove Tips & Best Practices (lines 674-687)
- [ ] Replace detailed idempotency (lines 422-493)
- [ ] Shorten production deployment (lines 618-662)
- [ ] Shorten testing CLI section (lines 577-585)
- [ ] Shorten testing troubleshooting (lines 587-595)
- [ ] Condense handler examples (lines 280-415)
- [ ] Review full tutorial flow
- [ ] Verify all links work

---

## REFERENCE: Line Numbers for Changes

This section provides exact line numbers for all changes. **Note:** Line numbers will shift as edits are made, so work sequentially.

### docs/tutorial.md Changes

**Branding (find-replace throughout):**

- Line 1: Title
- Line 3: Introduction
- Line 18: Link text
- Line 155: Heading
- Line 214: Body text
- Line 698: Link text

**Content removal/shortening:**

- Lines 422-493: Remove detailed idempotency implementation (72 lines)
- Lines 577-585: Condense CLI inspection section (reduce to 2-3 lines)
- Lines 587-595: Condense troubleshooting (keep 3 items)
- Lines 618-662: Shorten production deployment (reduce ~30 lines)
- Lines 674-687: Remove Tips & Best Practices entirely (14 lines)
- Lines 280-415: Condense handler examples (reduce ~30 lines)

**SDK code examples:**

- Lines 159-215: Update to use Chargebee SDK

### README.md Changes

**Branding:**

- Line 1: Title
- Line 7: Description

---

**End of Implementation Plan**
