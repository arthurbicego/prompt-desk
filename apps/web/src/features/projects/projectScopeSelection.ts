const PROJECT_SCOPE_PREFIX = "project:";
const ALL_PROJECTS_SCOPE = "all-projects";

export function projectScopeId(projectId: string): string {
  return `${PROJECT_SCOPE_PREFIX}${projectId}`;
}

export function normalizeProjectScopes(scopes: string[], projectIds: string[]): string[] {
  const currentProjectScopes = new Set(projectIds.map(projectScopeId));
  const expandedScopes = scopes.flatMap((scope) => (scope === ALL_PROJECTS_SCOPE ? [...currentProjectScopes] : [scope]));
  const nextScopes: string[] = [];

  for (const scope of expandedScopes) {
    if (scope.startsWith(PROJECT_SCOPE_PREFIX) && !currentProjectScopes.has(scope)) continue;
    if (!nextScopes.includes(scope)) nextScopes.push(scope);
  }

  return nextScopes;
}

export function areAllProjectScopesSelected(scopes: string[], projectIds: string[]): boolean {
  if (projectIds.length === 0) return false;
  const selected = new Set(normalizeProjectScopes(scopes, projectIds));
  return projectIds.every((projectId) => selected.has(projectScopeId(projectId)));
}

export function toggleScopeSelection(scopes: string[], scopeId: string, projectIds: string[]): string[] {
  if (scopeId === ALL_PROJECTS_SCOPE) return toggleAllProjectScopes(scopes, projectIds);

  const normalizedScopes = normalizeProjectScopes(scopes, projectIds);
  const nextScopes = normalizedScopes.includes(scopeId)
    ? normalizedScopes.filter((scope) => scope !== scopeId)
    : [...normalizedScopes, scopeId];

  return nextScopes;
}

function toggleAllProjectScopes(scopes: string[], projectIds: string[]): string[] {
  const normalizedScopes = normalizeProjectScopes(scopes, projectIds);
  const projectScopes = projectIds.map(projectScopeId);
  if (projectScopes.length === 0) return normalizedScopes;

  const selectedScopes = new Set(normalizedScopes);
  const allProjectsSelected = projectScopes.every((scope) => selectedScopes.has(scope));
  const nextScopes = allProjectsSelected
    ? normalizedScopes.filter((scope) => !projectScopes.includes(scope))
    : [...normalizedScopes, ...projectScopes.filter((scope) => !selectedScopes.has(scope))];

  return nextScopes;
}
