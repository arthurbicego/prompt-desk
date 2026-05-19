import { afterEach, describe, expect, it, vi } from "vitest";

describe("runCommand", () => {
  afterEach(() => {
    vi.doUnmock("node:child_process");
    vi.resetModules();
  });

  it("returns a failed command result when spawn throws synchronously", async () => {
    vi.resetModules();
    vi.doMock("node:child_process", () => ({
      spawn: () => {
        throw new Error("spawn EBADF");
      }
    }));

    const { runCommand } = await import("./gitService.js");

    await expect(runCommand("git", ["status"])).resolves.toEqual({
      code: null,
      stdout: "",
      stderr: "spawn EBADF"
    });
  });
});
