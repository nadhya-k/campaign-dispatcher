/*

- Layer = Adapter (Integration)

This file has the sole responsibility of:
- translating a generic CampaignJob into a call to a specific external push notification provider. 

Dependencies (consumer -> provider):
- Adapter layer (this file) -> integrates with external push provider
- Application layer (worker.ts) -> calls this adapter via dispatch map
- Infrastructure layer (queue.ts) -> supplies the CampaignJob type contract

Adapter contract:
- Accepts a CampaignJob where `channel` is "push" and `recipientId` is a device token.
- Resolves on successful delivery.
- Rejects (throws) on failure so Bull can retry the job automatically.

To replace this stub with a real provider:
- Swap the console.log and setTimeout for a real SDK call (e.g. Firebase Cloud Messaging, APNs) - no other file needs to change.

*/

import { CampaignJob } from "../queue";

export async function pushAdapter(job: CampaignJob): Promise<void> {
  console.log("[PUSH]", job.recipientId, job.payload);

  /* ----- Dispatches a campaign job via push notification ----- 

- Define the parameter 'job' for the campaign job to deliver.
-- The 'job.recipientId' is the destination device token.
-- The 'job.payload' contains the notification content (e.g. title, body, data object).

- Return a promise that resolves when delivery is complete.

 */

  await new Promise<void>((r) => setTimeout(r, 80)); // Simulates the async latency of a real push notification provider (80ms).

  // Replace this with a real provider SDK call in production.
}