# campaign-dispatcher

A multi-channel campaign dispatching service built with Node.js, TypeScript, Express, and Bull/Redis.
The campaign dispatcher accepts campaign requests over HTTP and delivers them asynchronously via email, push notification, or SMS - using a producer/consumer queue architecture with two separate processes.

---

## Table of contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Running with Docker](#running-with-docker)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Running tests](#running-tests)
- [Adding a new channel](#adding-a-new-channel)
- [Key design decisions](#key-design-decisions)

---

## Overview

campaign-dispatcher solves a common backend problem: a client submits a message to be sent to a recipient, but the actual delivery (calling an email provider, a push notification service, or an SMS gateway) is slow and should not block the HTTP response.

The service handles this by separating two concerns into two processes:

-- The **API process** accepts the request, validates it, enqueues the job, and immediately returns '202 Accepted'.
-- The **worker process** picks up jobs from the queue and dispatches them to the appropriate delivery adapter.

Redis (via Bull) is the durable bridge between the two. Jobs survive process restarts and can be retried automatically if delivery fails.

---

## Architecture

```
Client
  |
  |  POST /campaigns
  V
-------------------
|   API process   |  (src/index.ts + src/app.ts)
|                 |
|  Express HTTP   |
|  server :3001   |
|                 |
| routes/         |
|  campaigns.ts   |-----> campaignQueue.add(job) -----> Redis (Bull)
-------------------                                      |
                                                         | job available
                                                         V
                                              ------------------------
                                              |   Worker process     |
                                              |  (src/worker.ts)     |
                                              |                      |
                                              |  adapters dispatch   |
                                              |  map:                |
                                              |    email -> email.ts |
                                              |    push -> push.ts   |
                                              |    sms -> sms.ts     |
                                              ------------------------
```

---

## Project structure

```
campaign-dispatcher/
|
|___ src/
|   |___ index.ts    # Entry point: starts HTTP server, handles shutdown
|   |
|   |___ app.ts    # Express app factory: middleware + route mounting
|   |
|   |___ queue.ts    # Shared Bull queue instance and CampaignJob type
|   |
|   |___ worker.ts     # Worker process: consumes queue, dispatches to adapters
|   |
|   |___ routes/
|   |   |___ campaigns.ts    # POST /campaigns and GET /campaigns handlers
|   |
|   |___ adapters/
|   │   |___ email.ts    # Email delivery adapter (stub)
|   │   |___ push.ts   # Push notification adapter (stub)
|   |   |___ sms.ts    # SMS delivery adapter (stub)
|   |
|   |___ __tests__/
|       |___ adapters.test.ts   # Unit tests: adapter functions in isolation
|       |___ campaigns.test.ts    # Integration tests: full HTTP + queue cycle
|
|___ .github/
|   |___ workflows/
|       |___ ci.yml    # GitHub Actions CI: lint, test, build
|
|___ Dockerfile    # Multi-stage build for production image
|
|___ docker-compose.yaml   # Local dev: api + worker + redis containers
|
|___.env.example   # Template for required environment variables
|
|___ jest.config.js    # Jest configuration with coverage thresholds
|
|___ tsconfig.json   # TypeScript compiler options
|
|___ package.json    # Dependencies and npm scripts
```

### Why each folder exists

Folder/file: 'src/routes'
Purpose: One file per HTTP resource. As the API grows, consider adding 'routes/users.ts' and 'routes/analytics.ts' etc. without touching 'app.ts'.

Folder/file: 'src/adapters/'
Purpose: One file per delivery channel. Each adapter translates a generic 'CampaignJob' into a provider-specific API call. Swap providers by changing one file.

Folder/file: 'src/**tests**/'
Purpose: Jest convention. Double-underscore prefix signals tooling/meta content. Co-located with source for easy navigation.

---

## Prerequisites

-- Node.js 20+
-- npm 9+
-- Redis 7+ (or Docker)

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

The defaults in '.env.example' work for local development with Redis running on localhost.

### 3. Start Redis

If you have Redis installed locally:

```bash
redis-server
```

Or with Docker (Redis only, no other containers):

```bash
docker run -p 6379:6379 redis:7-alpine
```

### 4. Start the API server (development mode with auto-reload)

```bash
npm run dev
```

### 5. Start the worker (in a second terminal)

```bash
npx ts-node-dev --respawn src/worker.ts
```

The API is now running at 'http://localhost:3001'.

---

## Running with Docker

Docker Compose starts all three services (api, worker, redis) together:

```bash
docker compose up --build
```

To run in the background:

```bash
docker compose up --build -d
```

To stop:

```bash
docker compose down
```

----- Services Overview -----

Service: 'api'
Port: 3001
Description: HTTP API server

Service: 'worker'
Port: none exposed
Description: Queue consumer (no exposed port)

Service: 'redis'
Port: 6379
Description: Job queue storage

---

## Environment variables

Variable: 'PORT'
Default: '3001'
Description: Port the HTTP server listens on

Variable: 'REDIS_HOST'
Default: 'localhost'
Description: Redis hostname. Set to 'redis' in Docker Compose.

Variable: 'REDIS_POST'
Default: '6379'
Description: Redis port

Variable: 'NODE_ENV'
Default: 'development'
Description: Node environment

Copy '.env.example' to '.env' and adjust values as needed.
Never commit '.env' to version control.

---

## API reference

### 'POST /campaigns'

Enqueue a new campaign for delivery.

**Request body**

```json
{
  "channel": "email" | "push" | "sms",
  "recipientId": "string",
  "payload": { "key": "value" }
}
```

Field: 'channel'
Type: `"email"` \| `"push"` \| `"sms"`
Description: Delivery channel

Field: 'recipientId'
Type: string
Description: Email address, device token, or phone number

Field: 'payload'
Type: object
Description: Channel-specific message content

**Response — 202 Accepted**

```json
{
  "campaignId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "queued"
}
```

**Example**

```bash
curl -X POST http://localhost:3001/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "email",
    "recipientId": "user@example.com",
    "payload": { "subject": "Hello", "body": "Your campaign is live." }
  }'
```

---

### 'GET /campaigns'

List all campaigns accepted since the API process started.

**Response — 200 OK**

```json
[
  {
    "campaignId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "channel": "email",
    "recipientId": "user@example.com",
    "payload": { "subject": "Hello" }
  }
]
```

> **Note:** this list is stored in memory and resets when the API process restarts. It is not shared across multiple API instances.

---

### 'GET /health'

Health check endpoint for container orchestrators.

**Response — 200 OK**

```json
{ "status": "ok" }
```

---

## Running tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode (re-runs on file save)
npm run test:watch
```

### Coverage thresholds

The project enforces minimum coverage via 'jest.config.js' file:

Metric: Branch coverage
Threshold: 70%

Metric: Function coverage
Threshold: 80%

Tests fail in CI if coverage drops below these thresholds.

### Test types

File: 'adapters.test.ts'
Test Type: Unit
What it Tests: Adapter functions called directly, no server or queue

File: 'campaigns.test.ts'
Test Type: Intergration
What it Tests: Full HTTP request cycle with real Redis queue

Integration tests require a running Redis instance. In CI, a Redis service container is started automatically by 'ci.yml'.
Locally, start Redis before running 'npm test'.

---

## Adding a new channel

The project is structured so that adding a new delivery channel (e.g. 'whatsapp') requires changes in exactly three places and nothing else:

**1. Add the channel to the union type in 'src/queue.ts'**

```typescript
channel: "email" | "push" | "sms" | "whatsapp";
```

**2. Create the adapter in 'src/adapters/whatsapp.ts'**

```typescript
import { CampaignJob } from "../queue";

export async function whatsappAdapter(job: CampaignJob): Promise<void> {
  // Call your WhatsApp Business API here
  console.log("[WHATSAPP]", job.recipientId, job.payload);
}
```

**3. Register the adapter in `src/worker.ts`**

```typescript
import { whatsappAdapter } from "./adapters/whatsapp";

const adapters: Record<CampaignJob["channel"], Adapter> = {
  email: emailAdapter,
  push: pushAdapter,
  sms: smsAdapter,
  whatsapp: whatsappAdapter, // add this line
};
```

TypeScript will produce a compile error at step 3 if you forget to add the adapter - the `Record<CampaignJob["channel"], Adapter>` type enforces exhaustiveness.

---

## Key design decisions

### Two processes instead of one

The API and worker run as separate processes (separate containers in Docker Compose). This means a slow or failing delivery cannot block HTTP responses, and each process can be scaled and restarted independently.

### 202 Accepted instead of 200 OK

-- The API returns '202 Accepted' rather than '200 OK' because delivery is asynchronous.
-- The HTTP spec defines 202 as "the request has been accepted for processing, but processing has not been completed."
-- This is the semantically correct response for a queued, fire-and-forget operation.

### Adapter pattern for delivery channels

-- Each delivery channel is an independent adapter function with the same signature.
-- The worker dispatches to adapters via a map keyed on the channel name.
-- Adding a channel requires only a new adapter file and one map entry - no branching logic changes anywhere else.

### app.ts / index.ts split

-- The Express app is defined in 'app.ts' and the server is started in 'index.ts'.
-- This separation means test files can import 'app' without starting a real server, enabling fast integration tests with 'supertest'.

### Bull / Redis for the queue

Bull provides persistence (jobs survive crashes), automatic retries on failure, concurrency control, and job state visibility. A simple in-memory array would lose all pending jobs on restart and would not support multiple worker instances.
