import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { AppError } from "../../util/errors.js";

const execFileAsync = promisify(execFile);
const PICKER_TIMEOUT_MS = 120000;

export async function chooseProjectFolder(): Promise<string | null> {
  if (process.platform !== "darwin") {
    throw new AppError(501, "FOLDER_PICKER_UNSUPPORTED", "Folder picker is only supported on macOS.");
  }

  try {
    const { stdout } = await execFileAsync(
      "osascript",
      [
        "-e",
        `set selectedFolder to choose folder with prompt ${toAppleScriptString("Choose project folder")}`,
        "-e",
        "POSIX path of selectedFolder"
      ],
      { timeout: PICKER_TIMEOUT_MS }
    );
    return normalizeSelectedFolderPath(stdout);
  } catch (error) {
    if (isPickerCancellation(error)) return null;
    throw new AppError(500, "FOLDER_PICKER_FAILED", "Could not open the folder picker.");
  }
}

export function normalizeSelectedFolderPath(stdout: string): string | null {
  const selectedPath = stdout.replace(/[\r\n]+$/, "");
  return selectedPath ? path.resolve(selectedPath) : null;
}

function toAppleScriptString(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`;
}

function isPickerCancellation(error: unknown): boolean {
  const candidate = error as { code?: unknown; stderr?: unknown };
  const stderr = typeof candidate.stderr === "string" ? candidate.stderr : "";
  return candidate.code === 1 && /user canceled|user cancelled/i.test(stderr);
}
