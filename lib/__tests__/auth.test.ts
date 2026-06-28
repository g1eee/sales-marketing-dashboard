import { describe, it, expect } from "vitest";
import { mapProfileToSessionUser } from "@/lib/auth";

describe("mapProfileToSessionUser", () => {
  it("merges auth user and profile row", () => {
    const result = mapProfileToSessionUser(
      { id: "u1", email: "a@b.com" },
      { full_name: "Andi", role: "sales" },
    );
    expect(result).toEqual({
      id: "u1",
      email: "a@b.com",
      role: "sales",
      fullName: "Andi",
    });
  });
  it("defaults role to sales when profile missing", () => {
    const result = mapProfileToSessionUser({ id: "u1", email: "a@b.com" }, null);
    expect(result.role).toBe("sales");
    expect(result.fullName).toBe("");
  });
});
