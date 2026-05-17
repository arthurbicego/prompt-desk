import type { GitState } from "@prompt-desk/shared";
import { spawn } from "node:child_process";

export interface GitStatus {
  branch: string | null;
  state: GitState;
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

async function git(repoPath: string, args: string[]): Promise<CommandResult> {
  return runCommand("git", ["-C", repoPath, ...args]);
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
}

export const gitService = new GitService();
