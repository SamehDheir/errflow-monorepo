# errflow

> Lightweight Node.js error monitoring that gives your AI dashboard everything it needs to fix bugs automatically.

`errflow` captures exceptions and unhandled rejections, enriches them with source code context, git history, and severity signals, then ships them to your dashboard — ready for an AI to generate a fix and open a PR.

---

## Features

| Feature | Description |
|---------|-------------|
| **Auto-capture** | Listens for `uncaughtException` & `unhandledRejection` out of the box |
| **Manual capture** | `Errflow.capture(err, metadata, hints)` anywhere in your code |
| **Code snippets** | Sends ±5 lines of source around the error line so the AI sees the actual code |
| **Git blame** | Surfaces who last touched the broken code and what their commit message said |
| **Git diff** | Attaches the most recent diff for the affected file to help detect what introduced the bug |
| **Severity scoring** | Rates each error `critical / high / medium / low` based on affected users, frequency, and URL path |
| **Regression detection** | Flags errors that reappear after being marked resolved |
| **Breadcrumbs** | Record the sequence of events leading up to a crash |
| **Request context** | Attaches HTTP method, URL, and body keys (never values) to each event |
| **Smart deduplication** | Identical errors sent at most once per 60-second window |
| **Concurrency control** | Max 2 in-flight requests — no thundering-herd on startup bursts |
| **Resilient transport** | 3 retries with exponential backoff; 4xx errors are not retried |
| **TypeScript-first** | Full type definitions; strict-mode compatible |
| **Zero-config ready** | Reads from environment variables automatically |

---

## Installation

```bash
npm install errflow
```

Requires **Node.js ≥ 18**.

---

## Quick Start

### 1. Set your API key

```bash
ERRFLOW_API_KEY=your_api_key_here
ERRFLOW_ENV=production
```

### 2. Initialize at app startup

```typescript
import { Errflow } from 'errflow';

Errflow.init({
  apiKey: process.env.ERRFLOW_API_KEY!,
  env: 'production',
});
```

### 3. Capture errors manually

```typescript
try {
  await processPayment(order);
} catch (error) {
  await Errflow.capture(
    error as Error,
    { orderId: order.id },           // metadata
    { url: req.url, affectedUsers: 1 } // severity hints
  );
}
```

Unhandled exceptions and promise rejections are tracked automatically from step 2.

---

## Express / Fastify Middleware

Add one line to wire up request context automatically on every route:

```typescript
import express from 'express';
import { Errflow } from 'errflow';

const app = express();

// Attaches method, url, bodyKeys, userId, traceId to every captured error.
// Clears automatically when the response finishes.
app.use(Errflow.middleware());
```

---

## Breadcrumbs

Record events leading up to a crash. All breadcrumbs are included in the error payload.

```typescript
Errflow.addBreadcrumb({
  message: 'User submitted checkout form',
  category: 'ui',
  level: 'info',
  data: { cartItems: 3 },
});

Errflow.addBreadcrumb({
  message: 'Payment API called',
  category: 'http',
  level: 'info',
});

// If an error is captured now, both breadcrumbs travel with it.
```

The last **50 breadcrumbs** are kept. Call `Errflow.clearBreadcrumbs()` at request boundaries.

---

## Regression Detection

After your dashboard merges a fix PR, call `markResolved` so errflow can detect if the same error comes back:

```typescript
// Call this from your dashboard webhook after a PR is merged
Errflow.markResolved('TypeError:Cannot read properties of null:at checkout (src/checkout.ts:87)');
```

If the error reappears, the payload will contain `isRegression: true` — giving the AI the signal that the previous fix didn't fully solve the problem.

---

## Configuration

### Via `init()`

```typescript
Errflow.init({
  apiKey: 'live_xxxxxxxx',      // required
  env: 'staging',               // default: 'production'
  apiUrl: 'https://api.errflow.dev/api/ingest', // default: https://api.errflow.dev/api/ingest
  disabled: false,              // default: false
  includeMemory: false,         // default: false — opt-in memory usage in payload
  debug: false,                 // default: false — emit internal [errflow] logs
});
```

### Via environment variables

| Variable | Required | Default |
|----------|----------|---------|
| `ERRFLOW_API_KEY` | **Yes** | — |
| `ERRFLOW_ENV` | No | `production` |
| `ERRFLOW_API_URL` | No | `https://api.errflow.dev/api/ingest` |
| `ERRFLOW_DISABLED` | No | `false` |
| `ERRFLOW_INCLUDE_MEMORY` | No | `false` |
| `ERRFLOW_DEBUG` | No | `false` |

> `Errflow.init()` takes priority over environment variables.

---

## API Reference

### `Errflow.init(config)`

Initializes the SDK and attaches global process listeners.

### `Errflow.capture(error, metadata?, hints?)`

Manually capture and send an error.

| Parameter | Type | Description |
|-----------|------|-------------|
| `error` | `Error` | The error to report |
| `metadata` | `Record<string, unknown>` | Any extra data (user IDs, order IDs, etc.) |
| `hints.affectedUsers` | `number` | Bumps severity to `critical` if > 100, `high` if > 10 |
| `hints.occurrencesLastHour` | `number` | Bumps severity to `critical` if > 50, `high` if > 10 |
| `hints.url` | `string` | Sets severity to `high` if it matches payment/auth paths |

### `Errflow.middleware()`

Returns an Express/Fastify-compatible middleware function.

### `Errflow.addBreadcrumb(crumb)`

Adds a breadcrumb to the current scope.

### `Errflow.clearBreadcrumbs()`

Clears all breadcrumbs (call at request boundaries).

### `Errflow.setRequestContext(ctx)` / `clearRequestContext()`

Manually set or clear request context (for non-Express setups).

### `Errflow.markResolved(fingerprint)`

Marks an error fingerprint as resolved. Triggers `isRegression: true` if it reappears.

### `Errflow.reset()`

Tears down listeners and clears all state. Designed for test teardown.

---

## Payload Schema

```json
{
  "fingerprint": "TypeError:Cannot read properties of null:at checkout (src/checkout.ts:87:12)",
  "errorName": "TypeError",
  "message": "Cannot read properties of null (reading 'id')",
  "stack": "...",
  "severity": "high",
  "isRegression": false,

  "codeContext": [
    {
      "file": "src/checkout.ts",
      "line": 87,
      "functionName": "processOrder",
      "snippet": [
        { "lineNumber": 84, "content": "  const user = await getUser(userId);", "isErrorLine": false },
        { "lineNumber": 85, "content": "  const cart = await getCart(user.id);", "isErrorLine": false },
        { "lineNumber": 86, "content": "", "isErrorLine": false },
        { "lineNumber": 87, "content": "  const total = cart.items.reduce(...);", "isErrorLine": true },
        { "lineNumber": 88, "content": "  return charge(user, total);", "isErrorLine": false }
      ]
    }
  ],

  "gitBlame": {
    "author": "Sameh",
    "authorEmail": "sameh@example.com",
    "commitHash": "a3f9c12",
    "commitMessage": "refactor: simplify cart aggregation",
    "committedAt": "2025-05-20T10:14:00.000Z"
  },

  "recentDiff": {
    "commitHash": "a3f9c12",
    "commitMessage": "refactor: simplify cart aggregation",
    "author": "Sameh",
    "committedAt": "2025-05-20T10:14:00.000Z",
    "diff": "@@ -84,7 +84,6 @@ async function processOrder(...) {\n-  if (!cart) return null;\n   const total = cart.items.reduce(...);\n ..."
  },

  "request": {
    "method": "POST",
    "url": "/api/checkout",
    "bodyKeys": ["cartId", "couponCode"],
    "userId": "user_123",
    "traceId": "abc-xyz"
  },

  "breadcrumbs": [
    { "message": "User submitted checkout", "category": "ui", "level": "info", "timestamp": "..." },
    { "message": "Payment API called", "category": "http", "level": "info", "timestamp": "..." }
  ],

  "environment": "production",
  "timestamp": "2025-05-24T09:32:11.742Z",
  "runtime": {
    "node": "v20.10.0",
    "platform": "linux",
    "arch": "x64",
    "cwd": "/app",
    "pid": 42
  }
}
```

---

## How It Works

```
Error thrown in your app
        ↓
errflow captures it (global listener or Errflow.capture)
        ↓
Fingerprint built from: error.name + message + first app stack frame
        ↓
Deduplication check — skip if sent in last 60 seconds
        ↓
Context collected:
  ├── Code snippet  (±5 lines from source file)
  ├── Git blame     (who last touched that line)
  ├── Git diff      (what changed in that file recently)
  └── Severity      (critical / high / medium / low)
        ↓
Payload sent to your dashboard (max 2 concurrent, 3 retries, 4xx not retried)
        ↓
Dashboard feeds payload to AI → AI generates fix → PR opened
        ↓
PR merged → Errflow.markResolved(fingerprint) called
        ↓
If error reappears → isRegression: true in next payload
```

---

## License

MIT © [errflow](https://github.com/SamehDheir/errflow)