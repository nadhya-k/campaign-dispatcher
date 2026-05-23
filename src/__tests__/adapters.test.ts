/*
- Layer = Test (Integration)

This layer contains the unit testing for Adapter functions.

*/

import { emailAdapter } from "../adapters/email";
import { pushAdapter } from "../adapters/push";
import { smsAdapter } from "../adapters/sms";

const baseJob = {
  // Shared base job fixture used across all adapter tests.
  campaignId: "test-c1",
  recipientId: "user@example.com",
  payload: { subject: "Hello" },
};

describe("emailAdapter", () => {
  // Each describe block spreads this and overrides 'channel' with 'as const' to satisfy the CampaignJob union type at compile time.
  it("resolves for a valid email job", async () => {
    const job = { ...baseJob, channel: "email" as const };
    await expect(emailAdapter(job)).resolves.toBeUndefined();
  });

  it("throws for an invalid email address", async () => {
    // recipientId has no "@" - the adapter guards against this and throws.

    const job = {
      ...baseJob,
      channel: "email" as const,
      recipientId: "not-an-email",
    };
    await expect(emailAdapter(job)).rejects.toThrow("Invalid email address"); // This verifies that Bull would receive a rejection and could retry or dead-letter the job rather than silently sending to an invalid address.
  });
});

describe("pushAdapter", () => {
  // Each describe block spreads this and overrides 'channel' with 'as const' to satisfy the CampaignJob union type at compile time.
  it("resolves for a valid push job", async () => {
    const job = { ...baseJob, channel: "push" as const };
    await expect(pushAdapter(job)).resolves.toBeUndefined(); // pushAdapter has no validation logic in the stub, so any recipientId resolves.
  });
});

describe("smsAdapter", () => {
  it("resolves for a valid sms job", async () => {
    // Each describe block spreads this and overrides 'channel' with 'as const' to satisfy the CampaignJob union type at compile time.
    const job = { ...baseJob, channel: "sms" as const };
    await expect(smsAdapter(job)).resolves.toBeUndefined(); // smsAdapter has no validation logic in the stub, so any recipientId resolves.
  });
});