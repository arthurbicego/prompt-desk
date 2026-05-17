import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeSelectedFolderPath } from "./folderPicker.js";

describe("folder picker", () => {
  it("normalizes selected folder output from the native picker", () => {
    expect(normalizeSelectedFolderPath("/Users/name/workspace/project/\n")).toBe("/Users/name/workspace/project");
  });

  it("treats empty picker output as cancellation", () => {
    expect(normalizeSelectedFolderPath("\n")).toBeNull();
  });

  it("preserves spaces in selected folder names", () => {
    expect(normalizeSelectedFolderPath("/Users/name/workspace/project name /\n")).toBe(
      "/Users/name/workspace/project name "
    );
  });

  it("resolves relative picker output defensively", () => {
    expect(normalizeSelectedFolderPath("workspace/project\n")).toBe(path.resolve("workspace/project"));
  });
});
