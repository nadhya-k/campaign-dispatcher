/*

- Layer = Test (Integration)

This file contains integration tests for the POST /campaigns and GET /campaigns HTTP endpoints. 
These tests exercise the full HTTP request cycle: Express routing, request body handling, UUID generation, in-memory campaign storage, and Bull queue enqueuing, in a single test run.

Tools used in integration testing:
-- supertest - makes real HTTP requests against the Express app without binding to a port. Imported app from app.ts (not index.ts) so no server is started; this is the app.ts / index.ts split design decision in practice.
-- campaignQueue.close() - Bull keeps an open Redis connection. Calling close() in afterAll() ensures the connection is released cleanly so Jest can exit without a timeout.

Prerequisites required for intergration testing:
- A running Redis instance is required for Bull to connect to.
- Locally: start Redis before running `npm test`.
- In CI: the ci.yml workflow starts a Redis service container automatically.

 */

import request from "supertest";
import { app } from "../app";
import { campaignQueue } from "../queue";

afterAll(async () => {
  // afterAll hook is used to close the Bull/Redis connection after all tests in this file have run.
  await campaignQueue.close();
});

//Without the afterAll hook, Jest would hang waiting for the open handle to close, because Bull maintains a persistent Redis connection.

describe("POST /campaigns", () => {
  // campaign request to assert HTTP status, and that response body contains campaignId property and a queued status.
  it("returns 202 and a campaignId", async () => {
    const res = await request(app)
      .post("/campaigns")
      .send({
        channel: "email",
        recipientId: "test@example.com",
        payload: { subject: "Test" },
      });

    expect(res.status).toBe(202); // HTTP status is 202 Accepted (not 200 - delivery is async).
    expect(res.body).toHaveProperty("campaignId"); // Response body contains a 'campaignId' property (UUID assigned by the route).
    expect(res.body.status).toBe("queued"); // Response body 'status' field equals "queued".
  });

  it("GET /campaigns returns the queued job", async () => {
    const res = await request(app).get("/campaigns");
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });

  /*
  
  After the POST above has pushed a job into the in-memory campaigns array, GET /campaigns should return a non-error response containing an array.
     
  Note: this test is order-dependent on the POST test above having run first within the same process, since the campaigns array is module-level state.

*/
});