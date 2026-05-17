import { describe, expect, it } from "vitest";
import {
  areAllProjectScopesSelected,
  normalizeProjectScopes,
  projectScopeId,
  toggleScopeSelection
} from "./projectScopeSelection";

const projectIds = ["project_1", "project_2", "project_3"];

describe("project scope selection", () => {
  it("expands legacy all-projects scope into listed project scopes", () => {
    expect(normalizeProjectScopes(["all-projects"], projectIds)).toEqual([
      "project:project_1",
      "project:project_2",
      "project:project_3"
    ]);
  });

  it("selects and deselects all listed projects through the all projects toggle", () => {
    const selected = toggleScopeSelection(["global"], "all-projects", projectIds);
    expect(selected).toEqual(["global", "project:project_1", "project:project_2", "project:project_3"]);
    expect(areAllProjectScopesSelected(selected, projectIds)).toBe(true);

    const deselected = toggleScopeSelection(selected, "all-projects", projectIds);
    expect(deselected).toEqual(["global"]);
    expect(areAllProjectScopesSelected(deselected, projectIds)).toBe(false);
  });

  it("allows every scope to be deselected without falling back to global", () => {
    expect(toggleScopeSelection(["global"], "global", projectIds)).toEqual([]);
    expect(toggleScopeSelection(["project:project_1"], "project:project_1", projectIds)).toEqual([]);
    expect(toggleScopeSelection(["project:project_1", "project:project_2", "project:project_3"], "all-projects", projectIds)).toEqual([]);
  });

  it("turns off all projects when a listed project is deselected", () => {
    const selected = toggleScopeSelection(["global"], "all-projects", projectIds);
    const partial = toggleScopeSelection(selected, projectScopeId("project_2"), projectIds);

    expect(partial).toEqual(["global", "project:project_1", "project:project_3"]);
    expect(areAllProjectScopesSelected(partial, projectIds)).toBe(false);
  });

  it("removes stale project scopes that are no longer listed", () => {
    expect(normalizeProjectScopes(["project:project_1", "project:removed"], ["project_1"])).toEqual(["project:project_1"]);
    expect(normalizeProjectScopes(["project:removed"], ["project_1"])).toEqual([]);
  });
});
