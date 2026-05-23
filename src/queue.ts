/*

- Layer =  Infrastructure

- This file/module owns the connection to Redis (an external system) and exposes a durable message queue that the layers above depend on.
- It is imported by both the API process (to enqueue jobs) and the worker process (to consume them). 
- Keeping the queue definition in one place ensures both processes always reference the same queue name and Redis connection settings, and share an identical understanding of job shape.
- Neither the Transport layer (routes) nor the Application layer (worker dispatch logic) needs to know how the queue is backed or how Redis is addressed because they import `campaignQueue` and `CampaignJob` from here and treat them as stable contracts.

Dependencies:
- Transport layer  (routes/campaigns.ts) ->  calls campaignQueue.add()
- Application layer (worker.ts) -> calls campaignQueue.process()
- Infrastructure layer (this file) -> owns the Bull + Redis binding

Bull uses Redis as its backing store, so jobs added here are durable: they survive process restarts and can be retried automatically on failure.

*/

import Bull from "bull";

export interface CampaignJob {
  // A single campaign dispatch job stored in the Bull queue.

  campaignId: string; // Define the property 'campaignId'  - UUID assigned by the API process at enqueue time. Used to correlate HTTP responses with queue jobs.
  channel: "email" | "push" | "sms"; // Define the property 'channel' - The delivery channel for this campaign must be one of the supported adapter types. Extending to a new channel requires adding the literal here and registering a matching adapter in worker.ts.
  recipientId: string; // Destination address for the chosen channel: email address for "email", device token for "push", phone number for "sms".
  payload: Record<string, unknown>; // Define the property 'payload' - Arbitrary channel-specific message content supplied by the caller (e.g. subject + body for email).
}

/*

//----- The shared Bull queue instance used by both the API and worker processes. -----//

- The API process calls `campaignQueue.add(job)` to enqueue incoming campaign requests after HTTP validation.
- The worker process calls `campaignQueue.process(handler)` to consume jobs and dispatch them to the appropriate delivery adapter.
 
 */

export const campaignQueue = new Bull<CampaignJob>("campaigns", {
  redis: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT ?? 6379),
  },
});