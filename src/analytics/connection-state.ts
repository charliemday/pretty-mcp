import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

interface ConnectionState {
  connectedKeyPrefixes: string[];
}

const STATE_DIR = join(homedir(), ".pretty-prompt");
const STATE_FILE = join(STATE_DIR, "mcp-analytics-state.json");

async function readState(): Promise<ConnectionState> {
  try {
    const raw = await readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<ConnectionState>;
    return {
      connectedKeyPrefixes: Array.isArray(parsed.connectedKeyPrefixes)
        ? parsed.connectedKeyPrefixes.filter((value) => typeof value === "string")
        : [],
    };
  } catch {
    return { connectedKeyPrefixes: [] };
  }
}

async function writeState(state: ConnectionState): Promise<void> {
  await mkdir(STATE_DIR, { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

export async function markKeyPrefixConnected(
  keyPrefix: string,
): Promise<boolean> {
  const normalized = keyPrefix.trim();
  if (!normalized) {
    return false;
  }

  const state = await readState();
  if (state.connectedKeyPrefixes.includes(normalized)) {
    return false;
  }

  state.connectedKeyPrefixes.push(normalized);
  await writeState(state);
  return true;
}
