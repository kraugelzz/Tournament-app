import { describe, it, expect } from "vitest";
import { hashPin, verifyPin } from "../../src/lib/pin";

describe("pin", () => {
  it("hashes deterministically to sha-256 hex", async () => {
    // Known SHA-256 of "1234"
    expect(await hashPin("1234")).toBe(
      "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4"
    );
  });
  it("verifies correct and rejects wrong pin", async () => {
    const h = await hashPin("secret");
    expect(await verifyPin("secret", h)).toBe(true);
    expect(await verifyPin("nope", h)).toBe(false);
  });
});
