/*
- Layer =  Application (Service)
- This file contains the core dispatch logic of the service: reading a job from the queue, selecting the correct adapter, and delegating delivery. 
- It has no knowledge of HTTP or transport concerns, and no knowledge of how any specific provider (email, push, SMS) works - those are Adapter layer details.
-  This process runs separately from the API process (separate container in Docker Compose). That separation means a slow or failing delivery can never block HTTP responses, and the worker can be scaled or restarted without affecting the API.

Dependencies:
- Application layer (this file)  -> orchestrates dispatch
- Infrastructure layer (queue.ts) -> consumed via campaignQueue.process()
- Adapter layer (adapters/*.ts)  -> called to perform actual delivery
 
Starting this process independently:
- npx ts-node-dev --respawn src/worker.ts

Or via Docker Compose, which starts api, worker, and redis together:
- docker compose up --build

*/

import { campaignQueue, CampaignJob } from "./queue";
import { emailAdapter } from "./adapters/email";
import { pushAdapter } from "./adapters/push";
import { smsAdapter } from "./adapters/sms";

type Adapter = (job: CampaignJob) => Promise<void>; // type alias for an adapter function.

/*

Every delivery adapter must conform to this signature so it can be stored in the dispatch map below and called uniformly by the queue processor.
The parameter'job' is used to describe the full campaign job data as enqueued by the API process.
The return Promise resolves when delivery is complete (or rejects on failure, allowing Bull to retry the job automatically).

*/

const adapters: Record<CampaignJob["channel"], Adapter> = {
  email: emailAdapter,
  push: pushAdapter,
  sms: smsAdapter,
};

/*

Dispatch map - the purpose of the dispatch map here is to route each channel value to its delivery adapter.

Use `Record<CampaignJob["channel"], Adapter>` to enforce exhaustiveness at compile time - if a new channel is added to the union type in queue.ts but not registered here, TypeScript produces a build error.

To add a new channel:
1. Add the channel literal to the `CampaignJob.channel` union in queue.ts.
2. Create the adapter in src/adapters/<channel>.ts.
3. Import and register it in this map.

*/

campaignQueue.process(async (job) => {
  const { channel, campaignId } = job.data;
  console.log(`[worker] processing ${channel} job ${campaignId}`);
  await adapters[channel](job.data);
  console.log(`[worker] dispatched ${channel} job ${campaignId}`);
});

/*

// ----- Register the Bull queue processor. Bull calls this handler for each job it dequeues. ----- //

/*

Bull calls this handler for each job it dequeues. The handler:
1. Destructures channel and campaignId from the job data.
2. Logs the start of processing for observability.
3. Looks up the matching adapter in the dispatch map.
4. Awaits the adapter — if it throws, Bull retries automatically.
5. Logs successful dispatch.

The two console.log calls provide basic operational visibility into which jobs the worker is picking up and completing. In production these would be replaced with structured logging.

*/