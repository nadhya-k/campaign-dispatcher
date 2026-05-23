/*

- Layer = Transport (HTTP)

This file is responsible for:

1. Parsing and validating inbound HTTP requests
2. Hand valid jobs off to the Infrastructure layer (the queue)
3. Format HTTP responses. 

It contains no delivery logic and no knowledge of how Bull, Redis, or any provider works internally.

Dependencies:
- Transport layer (this file) -> handles HTTP in/out
- Infrastructure layer (queue.ts) -> called via campaignQueue.add()

There is no dependency on Adapter layer here because the delivery is fully asynchronous.

Note on the in-memory list:
- The GET endpoint returns data stored in a plain array local to this module. 
- It resets on every process restart and is not shared across multiple API instances. 
- It is intended for basic observability only.

 */

import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { campaignQueue, CampaignJob } from "../queue";

const router = Router();

/*

- The constant 'campaigns defines the in-memory store of campaigns accepted by this process instance. 
- Each entry mirrors the shape of a CampaignJob so that callers can cross-reference the campaignId returned by POST /campaigns with this list.
- The limitation of this array is that it is not persisted and is not visible to other API process instances running behind a load balancer.

 */

const campaigns: CampaignJob[] = [];

/*

----- POST /campaigns -----

- Accepts a new campaign for asynchronous delivery.

- Request body (JSON) - fields are spread from req.body via CampaignJob shape:
-- channel {string} - "email" | "push" | "sms"
-- recipientId {string} - email address, device token, or phone number
-- payload {object} - channel-specific message content

Behaviour:
1. Generates a UUID as campaignId.
2. Spreads req.body into a CampaignJob alongside the new campaignId.
3. Pushes the job to the in-memory campaigns array for GET observability.
4. Enqueues the job via Bull (persisted to Redis).
5. Returns 202 Accepted immediately - delivery happens asynchronously in the worker process.

- Response - 202 Accepted: { campaignId: string, status: "queued" }

- The 202 status is intentional: the HTTP spec defines it as "the request has been accepted for processing, but processing has not been completed", which is the correct semantic for a queued, fire-and-forget operation.

 */

router.post("/", async (req: Request, res: Response) => {
  // accepts a new campaign for asynchronous delivery.

  // ----- Setting Validation guard -----

  // A job that enters Redis with bad data can never succeed and wastes worker processing cycles.
  // Failing here at the Transport layer keeps the queue clean and surfaces errors to the caller immediately.

  const { channel, recipientId, payload } = req.body;

  const validChannels = ["email", "push", "sms"] as const;

  if (!channel || !validChannels.includes(channel)) {
    // Reject requests with invalid fields before touching the queue.
    res.status(400).json({
      error: `channel is required and must be one of: ${validChannels.join(", ")}`,
    });
    return;
  }

  if (
    !recipientId ||
    typeof recipientId !== "string" ||
    recipientId.trim() === ""
  ) {
    // Reject requests with empty strings or missing fields before touching the queue.
    res.status(400).json({
      error: "recipientId is required and must be a non-empty string",
    });
    return;
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    // Reject requests with arrays and are not plain objects before touching the queue.
    res.status(400).json({
      error: "payload is required and must be a non-array object",
    });
    return;
  }

  // ----- End validation guard -----

  const campaignId = uuidv4();

  const job: CampaignJob = {
    ...req.body, // spread channel, recipientId, and payload from the request body
    campaignId,
  };

  campaigns.push(job);
  await campaignQueue.add(job);

  res.status(202).json({
    campaignId,
    status: "queued",
  });
});

/*

----- GET /campaigns -----

- Returns all campaigns accepted since this API process started.
- Response - 200 OK: Array of CampaignJob objects (may be empty on a fresh process start).

Note: Because the list is in-memory, it resets on restart and is not shared across horizontally scaled API instances.

*/

router.get("/", (_req: Request, res: Response) => {
  res.json(campaigns);
});

export default router;