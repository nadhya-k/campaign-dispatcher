/*

- Layer = Adapter (Integration)

- This file has sole responsibility of translating a generic CampaignJob into a call to a specific external email provider. 
- All three adapter files (email, push, sms) sit at this same layer.
- The adapter files are the boundary between the application's internal domain and third-party delivery APIs.

Dependencies (consumer -> provider):
- Adapter layer (this file) -> integrates with external email provider
- Application layer (worker.ts) -> calls this adapter via dispatch map
- Infrastructure layer (queue.ts) -> supplies the CampaignJob type contract

Adapter contract:
- Accept a CampaignJob where `channel` is "email" and `recipientId` is a valid email address (must contain "@").
- Resolve on successful delivery.
- Reject (throw) on failure so Bull can retry the job automatically.

Note: 
- Currently throws explicitly for an invalid email address format.
- To replace this stub with a real provider: Swap the console.log and setTimeout for a real SDK call (e.g. SendGrid, AWS SES, Mailgun) - no other file needs to change.

*/

import { CampaignJob } from "../queue";

export async function emailAdapter(job: CampaignJob): Promise<void> {
  /*

----- Dispatches a campaign job via email -----

-Define the parameter 'job' for the campaign job to deliver.
-- The 'job.recipientId' must be a valid email address (contains "@").
-- The 'job.payload' is expected to contain fields such as `subject` and `body`, though shape is not enforced here.

- Return a promise that resolves when delivery is complete.
- Generate an Error if 'job.recipientId' does not contain "@", indicating an invalid email address. Bull will not retry this job because it is a data error, not a transient network failure
- Consider adding dead-letter handling for these cases in production.

   */

  if (!job.recipientId.includes("@")) {
    // Implement a guard to rejec jobs with a clearly invalid recipient before attempting delivery.
    throw new Error(`Invalid email address: ${job.recipientId}`);
  } // A real provider SDK would also reject these, but failing fast here avoids an unnecessary network round-trip and produces a clearer error message.

  console.log(`[EMAIL] Sending to`, job.recipientId, job.payload);

  await new Promise<void>((resolve) => setTimeout(resolve, 200)); // Simulates the async latency of a real email provider API call (200ms).

  // Replace this with a real provider SDK call in production.
}