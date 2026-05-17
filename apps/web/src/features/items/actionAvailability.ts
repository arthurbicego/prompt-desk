import type { CodexItem, FileVersion } from "@prompt-desk/shared";

export interface ItemActionAvailability {
  openInVsCode: boolean;
  revealInFinder: boolean;
  compareWithCurrent: boolean;
  openHistoricalVersion: boolean;
  restoreVersion: boolean;
  applyAsCurrent: boolean;
  deleteItem: boolean;
  reason: string | null;
}

export function getItemActionAvailability(item: CodexItem | null | undefined, version?: FileVersion | null): ItemActionAvailability {
  if (!item) {
    return unavailable("Select an item to view actions.");
  }

  if (item.editability === "blocked" || item.status === "blocked") {
    return {
      ...unavailable(item.blockedReason ?? "This item is blocked by the safety policy."),
      revealInFinder: false
    };
  }

  if (item.editability === "deleted" || item.status === "deleted" || item.status === "missing") {
    return {
      openInVsCode: false,
      revealInFinder: true,
      compareWithCurrent: false,
      openHistoricalVersion: Boolean(version),
      restoreVersion: Boolean(version),
      applyAsCurrent: false,
      deleteItem: false,
      reason: "The current file is deleted or missing."
    };
  }

  if (item.editability === "read-only") {
    return {
      openInVsCode: false,
      revealInFinder: true,
      compareWithCurrent: Boolean(version),
      openHistoricalVersion: Boolean(version),
      restoreVersion: false,
      applyAsCurrent: false,
      deleteItem: false,
      reason: "Read-only items are available for inspection but not file edits, restore, apply, or delete."
    };
  }

  if (item.editability === "internal") {
    return {
      openInVsCode: false,
      revealInFinder: false,
      compareWithCurrent: Boolean(version),
      openHistoricalVersion: Boolean(version),
      restoreVersion: false,
      applyAsCurrent: false,
      deleteItem: true,
      reason: "This action affects PromptDesk internal data, not a real source file."
    };
  }

  return {
    openInVsCode: true,
    revealInFinder: true,
    compareWithCurrent: Boolean(version),
    openHistoricalVersion: Boolean(version),
    restoreVersion: Boolean(version),
    applyAsCurrent: Boolean(version),
    deleteItem: true,
    reason: null
  };
}

function unavailable(reason: string): ItemActionAvailability {
  return {
    openInVsCode: false,
    revealInFinder: false,
    compareWithCurrent: false,
    openHistoricalVersion: false,
    restoreVersion: false,
    applyAsCurrent: false,
    deleteItem: false,
    reason
  };
}
