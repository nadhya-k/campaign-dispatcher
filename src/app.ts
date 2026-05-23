/*
- Layer = Application Factory
 
- This file creates and configures the Express application object. 
- This file owns:
  1. Global middleware (CORS, JSON body parsing)
  2. Route mounting (delegating to routers in src/routes/)
  3. The /health endpoint
*/

import express from "express";
import cors from "cors";
import campaignsRouter from "./routes/campaigns";

export const app = express(); // Create the Express application instance.
// Exported as a named export so both index.ts (to start the server) and test files (to make requests without starting a server) can import it.

app.use(cors());

// ----- CORS middleware — Cross-Origin Resource Sharing - Why this is needed: ----- //
/* 
- Browsers enforce the Same-Origin Policy: a web page on https://my-frontend.com cannot make fetch() calls to https://my-api.com unless the API explicitly permits it via CORS headers. 
- The 'cors()' middleware adds the required 'Access-Control-Allow-Origin' response headers.
- The default 'cors()' call with no options allows all origins. Practically, this would be restricted to specific trusted origins if implemented in production, e.g. cors({ origin: "https://my-frontend.com" }).
 */

app.use(express.json());

// ----- JSON body parser middleware ----- //
/*
- `express.json()` is Express's built-in body parser (available since Express 4.16). It replaces the older `body-parser` npm package.
- Without this, `req.body` would be `undefined` for POST requests that send a JSON body. 
- This middleware reads the raw request body, parses it as JSON, and makes the result available as `req.body`.
- It only activates for requests whose Content-Type is application/json.
*/

app.use("/campaigns", campaignsRouter); // Mount the campaigns router at the /campaigns path prefix.
/*
- All requests to /campaigns and /campaigns/* are forwarded to campaignsRouter (defined in src/routes/campaigns.ts). 
- The router handles its own sub-paths relative to this prefix - so `router.post("/")` inside campaigns.ts handles `POST /campaigns`.
- This pattern keeps route definitions close to the resource they describe and allows each router to be developed and tested independently.
 */

app.get("/health", (_req, res) => {
  // Health check endpoint.
  res.json({
    status: "ok",
  });
});

// ----- Health Check Endpoint - Why this is needed: ----- //
/*
- Container orchestrators (Docker Compose's `healthcheck:`, Kubernetes liveness/readiness probes, AWS ALB target groups) periodically call a lightweight endpoint to verify the process is alive and responsive.
- Setting up a 200 response with `{ status: "ok" }` is the conventional contract.
- The handler uses `_req` (underscore prefix) for the request parameter to signal to TypeScript and linters that the parameter is intentionally unused - the health check doesn't need to inspect the request.
 */
