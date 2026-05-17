import type { AppPreferences } from "@prompt-desk/shared";
import { appPreferencesSchema } from "@prompt-desk/shared";
import { getDb } from "../connection.js";
import { parseJson, toJson } from "../json.js";
import { getDefaultPreferences } from "../../services/preferences/defaults.js";
import { nowIso } from "../../util/time.js";

type PreferenceKey = keyof AppPreferences;

interface PreferenceRow {
  key: string;
  value: string;
}

const PREFERENCE_KEYS = Object.keys(getDefaultPreferences()) as PreferenceKey[];

export class PreferencesRepository {
  getPreferences(): AppPreferences {
    const defaults = getDefaultPreferences();
    const rows = getDb().prepare("SELECT key, value FROM preferences").all() as PreferenceRow[];
    const values: Record<string, unknown> = { ...defaults };

    for (const row of rows) {
      if (!PREFERENCE_KEYS.includes(row.key as PreferenceKey)) continue;
      values[row.key] = parseJson(row.value, defaults[row.key as PreferenceKey]);
    }

    const parsed = appPreferencesSchema.safeParse(values);
    return parsed.success ? parsed.data : defaults;
  }

  patchPreferences(patch: Partial<AppPreferences>): AppPreferences {
    const current = this.getPreferences();
    const next = appPreferencesSchema.parse({ ...current, ...patch });
    const db = getDb();
    const updatedAt = nowIso();
    const statement = db.prepare(
      `INSERT INTO preferences (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    );

    const write = db.transaction(() => {
      for (const key of PREFERENCE_KEYS) {
        statement.run(key, toJson(next[key]), updatedAt);
      }
    });
    write();

    return next;
  }

  setPreference<K extends PreferenceKey>(key: K, value: AppPreferences[K]): AppPreferences {
    return this.patchPreferences({ [key]: value } as Partial<AppPreferences>);
  }
}

export const preferencesRepository = new PreferencesRepository();
