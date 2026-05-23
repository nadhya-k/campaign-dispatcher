/*
- Layer = Entry Point.
- This is the single entry point for the HTTP server process. 
- Its only responsibilities are to bind the Express app to a port and to handle graceful shutdown. 
- All application configuration (middleware, routes) lives in app.ts, not here.
*/

import { app } from "./app";

const PORT = process.env.PORT ?? 3001; // The `??` (nullish coalescing) operator only falls back on null/undefined, not on other falsy values like 0 or "".
// The PORT variable is set in .env (see .env.example) and injected via docker-compose.yaml in the `api` service's environment block.

// const server is used to start the HTTP server by binding to PORT, so we can close it cleanly in the SIGTERM handler below.
const server = app.listen(PORT, () => {
  // `app.listen` returns a `http.Server` instance which we store in a constant
  console.log(`API running on port ${PORT}`);
});

// ----- ShutDown on SIGTERM ----- //

/* 
- When Docker stops a container, it sends SIGTERM to the process before forcibly killing it after a timeout (typically 30s). 
- Without this handler the Node.js process would exit immediately, dropping any in-flight HTTP requests mid-response.

*/

process.on("SIGTERM", () => {
  server.close(() => {
    // `server.close()` stops accepting NEW connections but lets existing connections finish their current request/response cycle.
    console.log("Server closed gracefully");

    process.exit(0); // Only after the last open connection drains does the callback fire and we exit with code 0 (success), signalling to the container orchestrator that the shutdown was intentional and clean.
  });
});