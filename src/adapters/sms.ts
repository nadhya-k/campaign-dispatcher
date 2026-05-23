/*

- Layer = Adapter (Integration)
This file belongs has the sole responsibility of:
- translating a generic CampaignJob into a call to a specific external SMS gateway. 

Dependencies (consumer -> provider):
- Adapter layer (this file) -> integrates with external SMS gateway
- Application layer (worker.ts) -> calls this adapter via dispatch map
- Infrastructure layer (queue.ts) -> supplies the CampaignJob type contract

Adapter contract:
- Accepts a CampaignJob where `channel` is "sms" and `recipientId` is a phone number.
- Resolves on successful delivery.
- Rejects (throws) on failure so Bull can retry the job automatically.

To replace this stub with a real provider: Swap the console.log and setTimeout for a real SDK call (e.g. Twilio, AWS SNS) — no other file needs to change.

 */

import { CampaignJob } from "../queue";

export async function smsAdapter(job: CampaignJob): Promise<void> {
  console.log("[SMS]", job.recipientId, job.payload);

  /* ----- Dispatches a campaign job via SMS -----

- Define the parameter 'job' for the campaign job to deliver.
-- The 'job.recipientId' is the destination phone number.
-- The 'job.payload' contains the message content (e.g. text body).

- Return a promise that resolves when delivery is complete.

 */

  await new Promise<void>((r) => setTimeout(r, 120)); // Simulates the async latency of a real SMS gateway API call (120ms).
  // Replace this with a real provider SDK call in production.
}