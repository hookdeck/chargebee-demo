# **Chargebee + Hookdeck Event Gateway Tutorial Style Guide**

This style guide defines how tutorials written collaboratively between Chargebee and Hookdeck should be structured, written, and formatted. It is based on Chargebee’s existing tutorial style, combined with Hookdeck’s technical writing preferences.

# **1. Tone and Voice**

### **Overall tone**

- Practical, direct, developer-focused.

- Clear and instructional, not promotional.

- Uses precise technical language without unnecessary jargon.

- Friendly but concise. Avoid overly casual or humorous phrasing.

- Use active voice and present tense.

  ### **Assumptions about the reader**

- Intermediate developer comfortable with APIs, JSON, HTTP, and basic backend frameworks.

- Not assumed to know webhook reliability patterns or event routing best practices.

- Not assumed to be deeply familiar with either Chargebee or Hookdeck.

  ### **Voice characteristics**

- Use “you” and “your application” to speak directly to the reader.

- Keep explanations crisp. If something needs more context, give it in one short paragraph.

- Never use marketing terms like “seamless”, “powerful”, “effortless”, “revolutionary”.

- No product comparisons or persuasion. Let the tutorial stand on its technical value.

# **2. Structure of the Tutorial**

Chargebee tutorials follow a consistent structure. We adopt the same structure here, extended with Event Gateway concepts.

### **Structure template**

1. **Title**

2. **Introduction**

3. **Prerequisites**

4. **Architecture Overview**

5. **Step-by-Step Setup**
   - Programmatic setup of Chargebee webhook endpoint

   - Programmatic setup of Hookdeck Event Gateway Connections

6. **Implementing Handlers (by event group)**

7. **Testing and Verification**

8. **Observability, Debugging, and Replay**

9. **Monitoring and Alerting**

10. **Wrap-Up and Extensions**

11. **Additional Resources**

    ### **Formatting conventions**

- Use H2/H3 headings consistently.

- Short paragraphs.

- Numbered lists for sequential steps.

- Bulleted lists for explanations or options.

- Use code fences for all code samples:

- Show one runnable example at a time—avoid large code dumps.

- Use screenshots sparingly and always include a short caption:

  _“Event delivery in the Hookdeck Event Gateway dashboard.”_

# **3. Technical Conventions and Terminology**

### **Chargebee terminology**

Use their canonical terms:

- “Webhook Endpoint”

- “Test Site” / “Live Site”

- “Event Payload”

- “Subscription Renewal”

- “Customer Record”

- “Payment Intent”

- “Event Type”

  ### **Hookdeck Event Gateway terminology**

Use these terms consistently:

- **Connection** — the top-level object that defines routing

- **Source** — where events originate (Chargebee)

- **Destination** — where events are forwarded (your backend endpoint)

- **Filter** — optional condition inside a Connection (e.g., event*type starts with subscription*)

- **Delivery Attempt**

- **History**

- **Retry**

- **Replay**

- **Dashboard** (not “Console”)

  ### **Important**

A **Connection defines the route**.

There is **no separate “Route” object**.

All tutorial text should use:

- “Create a Connection”

- “Configure a Connection to forward…”

- “Each Connection handles specific event types”

  ### **Language conventions**

- Use “Basic Auth” (correct)

- Use “idempotent” for repeated-safe API calls

- Use “event-driven” (hyphenated)

- Avoid phrases like “next-gen”, “modernize”, “synergy”

# **4. Writing Style Do’s and Don’ts**

### **Do**

✓ Start with a clear problem statement

✓ Provide code early on

✓ Keep handlers simple and narrow

✓ Use real Chargebee event types and payload shapes

✓ Show what success looks like

✓ Highlight how to test safely

✓ Demonstrate reliability features through action (replay, retries)

### **Don’t**

✗ No marketing content

✗ No large architectural essays

✗ No assumptions about readers knowing webhook internals

✗ No framework-specific deep dives

✗ No multi-page code dumps

✗ No references to “routes” (use “Connections”)

# **5. Special Considerations for This Collaboration**

- Focus the tutorial on **subscription lifecycle**, **customer updates**, and **payment succeeded** events (based on Chargebee’s real usage data).

- Mention payment failure/dunning only as a small optional extension.

- Emphasize:
  - Reliability

  - Observability

  - Testing

  - Idempotent setup

  - Clean separation of concerns

- All screenshots should be the **Hookdeck Event Gateway dashboard**.

- All examples should be runnable, minimal, and realistic.

# **6. Code Presentation Guidelines for Tutorials**

When writing tutorials using this codebase, follow these guidelines to balance clarity with completeness:

### **Show Simplified Examples in Tutorial**

- Use `ESSENTIAL_WEBHOOK_EVENTS` constant (6 events) in tutorial code examples
- Reference that the full production implementation uses `ALL_WEBHOOK_EVENTS` (24 events)
- Link to the complete GitHub repository for full implementation details

### **Code Snippet Strategy**

**Show complete code for:**

- Handler patterns (customer, subscription, payment handlers are already tutorial-ready)
- Connection filter rules (show one complete example)
- Express routing setup (`src/index.ts` - entire file is appropriate)

**Show simplified/partial code for:**

- Event type lists (show 5-6 essential events, mention full list in repo)
- Error handling patterns (show basic pattern, reference production version)
- Form-data encoding logic (summarize as "helper function", link to implementation)
- TypeScript type definitions (show key interfaces only)

### **Reference Pattern**

Use this phrasing when showing simplified code:

> "This example shows the essential event types. The [complete implementation](REPO_URL) includes all 24 Chargebee webhook events for production use."

Or for complex utilities:

> "The setup script uses a helper function to handle API requests. See the [full implementation](REPO_URL) in `scripts/shared.ts` for details."

### **Tutorial-Friendly Features Already in Codebase**

These files/functions are tutorial-ready as-is:

- **Handler functions** - All three handlers have clear documentation and focused logic
- **Express setup** (`src/index.ts`) - Clean, minimal, well-commented
- **Connection definitions** - Declarative and easy to understand
- **Constants** - `ESSENTIAL_WEBHOOK_EVENTS` and `ALL_WEBHOOK_EVENTS` clearly separated

### **Code Example Length Guidelines**

- **Inline examples**: 10-20 lines maximum
- **Full code blocks**: 30-50 lines maximum
- **When longer**: Extract key concepts, show structure, link to complete file

### **Comment Style in Tutorial Code**

Tutorial code examples should include:

- Brief explanatory comments before key operations
- Inline comments for non-obvious logic
- "TUTORIAL NOTE" comments already in handlers - reference these
- Links to relevant documentation when introducing new concepts

# **Full Tutorial Outline**

Below is the full outline you can share with Chargebee as the proposed structure for the collaborative tutorial.

## Reliable Subscription & Customer Automation with Chargebee Webhooks and the Hookdeck Event Gateway

_(Proposed Collaborative Tutorial Outline)_

### 1. Introduction

A short overview covering:

- What this tutorial teaches

- Why subscription, customer, and payment events form the core of Chargebee automation

- What reliability challenges developers commonly face

- How the Hookdeck Event Gateway fits into the workflow

Example high-level architecture:

```
Chargebee → Hookdeck Event Gateway → Application Endpoints
```

### 2. Prerequisites

List the minimal requirements:

- Chargebee test site

- Hookdeck account with Event Gateway enabled

- Node.js (or Python) for code examples

- ngrok or localhost tunneling if applicable

- Basic understanding of HTTP POST requests

Keep this section short.

### 3. Architecture Overview

A simple diagram or bullet list showing:

- Chargebee sends events to the Event Gateway

- The Event Gateway authenticates, records, and forwards them

- Each **Connection** forwards specific event types to its destination:
  - Customer updates

  - Subscription changes

  - Successful payments

### 4. Step 1 — Programmatically Create Hookdeck Event Gateway Connections

Create the Hookdeck Source and three Connections **first**, as this step generates the webhook URL needed for Chargebee configuration.

**Important:** The Hookdeck Source must be created before configuring Chargebee, since it provides the URL that Chargebee will send events to.

Create three Connections:

### **Customer Connection**

- Source: Chargebee (with Basic Auth credentials)

- Filter: event*type starts with customer*

- Destination: /webhooks/chargebee/customer

  ### **Subscription Connection**

- Filter: event*type starts with subscription*

- Destination: /webhooks/chargebee/subscription

  ### **Payments Connection**

- Filter: event_type = payment_succeeded

- Destination: /webhooks/chargebee/payments

All Connection setup:

- Is done through the Event Gateway API

- Creates a Source with Basic Auth (credentials must match what you'll configure in Chargebee)

- Generates the webhook URL that will be used in Step 5

- Must be idempotent

- Supports DEV, Staging, Prod environment patterns

Benefits:

- Clean separation of concerns

- Minimal, focused handlers

- Easier testing and reliability

- Provides the Source URL needed for Chargebee configuration

### 5. Step 2 — Programmatically Create the Chargebee Webhook Endpoint

Use the Chargebee **Webhook Endpoints API** to create the webhook, using the Hookdeck Source URL from Step 4.

**Important:** This step uses the webhook URL generated by the Hookdeck Source in Step 4.

The script should:

- Create the webhook endpoint pointing to the Hookdeck Source URL

- Configure Basic Auth credentials (must match those configured in the Hookdeck Source)

- Subscribe to these event types:
  - customer_created

  - customer_changed

  - subscription_created

  - subscription_renewed

  - subscription_changed

  - payment_succeeded

- Make setup **idempotent** so it can be re-run safely across environments

Benefits:

- No manual config drift

- Repeatable infrastructure setup

- Clear, auditable webhook definitions

- Ensures credentials match between Chargebee and Hookdeck

### 6. Step 3 — Implement Minimal Handlers for Each Workflow

### **Customer Handler**

Endpoint: /webhooks/chargebee/customer

Handles:

- Syncing customer profile changes

- Updating internal CRM/user tables

- Applying metadata changes

  ### **Subscription Handler**

Endpoint: /webhooks/chargebee/subscription

Handles:

- Provisioning on creation

- Updating entitlements on plan changes

- Extending access on renewal

- Processing metadata changes

  ### **Payments Handler**

Endpoint: /webhooks/chargebee/payments

Handles:

- Renewal confirmation

- Revenue/metrics updates

- Clearing “pending renewal” flags

Notes:

- Developers are responsible for idempotency

- Event Gateway reduces retry noise but apps must use event.id

- Code samples should be small and runnable

### 7. Step 4 — Testing the Flow End-to-End

- Trigger test events from Chargebee

- Confirm they arrive in the Event Gateway

- Confirm correct Connection routing

- Confirm delivery to the correct handler

Screenshots:

- Event Gateway delivery logs

- Example payload

### 8. Step 5 — Observability, Debugging, and Replay

Show how to use the Event Gateway dashboard to:

- Inspect event payloads

- View delivery attempts and status codes

- Simulate backend downtime

- Replay missed events

Benefits:

- No lost updates

- Faster debugging

- Full lifecycle visibility

### 9. Step 6 — Monitoring & Alerting

Show how to configure alerts for:

- Repeated 4XX/5XX failures

- Latency spikes

- Delivery queue thresholds

Benefits:

- Proactive reliability

- Early detection of webhook integration issues

### 10. Wrap-Up and Extensions

Optional extension ideas:

- Handling invoice events

- Forwarding events to analytics/CRM systems

- Adding transformations for data redaction/enrichment

- Running multi-environment setups reliably

### 11. Additional Resources

Links to:

- Chargebee Events API docs

- Chargebee Webhook Endpoints API

- Hookdeck Event Gateway docs

- Example repos (if included)
