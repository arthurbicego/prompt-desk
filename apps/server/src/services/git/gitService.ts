import type { GitState } from "@prompt-desk/shared";
import { spawn } from "node:child_process";

export interface GitStatus {
  branch: string | null;
  state: GitState;
}

export interface GitWorktree {
  path: string;
  head: string | null;
  branch: string | null;
  isBare: boolean;
  isDetached: boolean;
  isLocked: boolean;
  lockedReason: string | null;
  isPrunable: boolean;
  prunableReason: string | null;
}

export interface GitWorktreeList {
  worktrees: GitWorktree[];
  error: string | null;
}

interface CommandResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

function runCommand(command: string, args: string[], timeoutMs = 5000): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      shell: false,
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGTERM");
      resolve({ code: null, stdout, stderr: "Command timed out." });
    }, timeoutMs);

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code: null, stdout, stderr: error.message });
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

async function git(repoPath: string, args: string[], timeoutMs?: number): Promise<CommandResult> {
  return runCommand("git", ["-C", repoPath, ...args], timeoutMs);
}

export class GitService {
  async getStatus(repoPath: string): Promise<GitStatus> {
    const insideWorkTree = await git(repoPath, ["rev-parse", "--is-inside-work-tree"]);
    if (insideWorkTree.code === null) {
      return { branch: null, state: "unknown" };
    }
    if (insideWorkTree.code !== 0 || insideWorkTree.stdout.trim() !== "true") {
      return { branch: null, state: "not-git" };
    }

    const branchResult = await git(repoPath, ["branch", "--show-current"]);
    if (branchResult.code !== 0) {
      return { branch: null, state: "unknown" };
    }

    const branch = branchResult.stdout.trim();
    if (!branch) {
      return { branch: null, state: "detached" };
    }

    const statusResult = await git(repoPath, ["status", "--porcelain"]);
    if (statusResult.code !== 0) {
      return { branch, state: "unknown" };
    }

    return {
      branch,
      state: statusResult.stdout.trim().length > 0 ? "dirty" : "clean"
    };
  }

  async listWorktrees(repoPath: string): Promise<GitWorktreeList> {
    const insideWorkTree = await git(repoPath, ["rev-parse", "--is-inside-work-tree"]);
    if (insideWorkTree.code === null) {
      return { worktrees: [], error: insideWorkTree.stderr || "Git command timed out." };
    }
    if (insideWorkTree.code !== 0 || insideWorkTree.stdout.trim() !== "true") {
      return { worktrees: [], error: null };
    }

    const result = await git(repoPath, ["worktree", "list", "--porcelain"], 8000);
    if (result.code === null) {
      return { worktrees: [], error: result.stderr || "Git worktree list timed out." };
    }
    if (result.code !== 0) {
      return { worktrees: [], error: result.stderr.trim() || "Could not list Git worktrees." };
    }

    return { worktrees: parseWorktreePorcelain(result.stdout), error: null };
  }
}

export const gitService = new GitService();

export function parseWorktreePorcelain(output: string): GitWorktree[] {
  return output
    .split(/\n{2,}/)
    .map((block) => parseWorktreeBlock(block))
    .filter((worktree): worktree is GitWorktree => worktree !== null);
}

function parseWorktreeBlock(block: string): GitWorktree | null {
  const lines = block
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
  let worktreePath: string | null = null;
  let head: string | null = null;
  let branch: string | null = null;
  let isBare = false;
  let isDetached = false;
  let isLocked = false;
  let lockedReason: string | null = null;
  let isPrunable = false;
  let prunableReason: string | null = null;

  for (const line of lines) {
    const { label, value } = splitPorcelainLine(line);
    if (label === "worktree") {
      worktreePath = value;
    } else if (label === "HEAD") {
      head = value;
    } else if (label === "branch") {
      branch = shortRef(value);
    } else if (label === "bare") {
      isBare = true;
    } else if (label === "detached") {
      isDetached = true;
    } else if (label === "locked") {
      isLocked = true;
      lockedReason = value || null;
    } else if (label === "prunable") {
      isPrunable = true;
      prunableReason = value || null;
    }
  }

  if (!worktreePath) {
    return null;
  }

  return {
    path: worktreePath,
    head,
    branch,
    isBare,
    isDetached,
    isLocked,
    lockedReason,
    isPrunable,
    prunableReason
  };
}

function splitPorcelainLine(line: string): { label: string; value: string } {
  const separator = line.indexOf(" ");
  if (separator === -1) {
    return { label: line, value: "" };
  }

  return {
    label: line.slice(0, separator),
    value: line.slice(separator + 1)
  };
}

function shortRef(ref: string): string {
  return ref.replace(/^refs\/heads\//, "").replace(/^refs\/remotes\//, "");
}
