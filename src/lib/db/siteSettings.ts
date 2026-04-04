/**
 * ES: site_settings (JSON) — landing público y merges con defaults.
 * EN: site_settings (JSON) — public landing and merges with defaults.
 */

import type { RowDataPacket } from "mysql2";
import {
  DEFAULT_LANDING_CONFIG,
  mergeLandingConfig,
  type LandingBrandingConfig,
} from "@/types/landing.types";
import {
  getMariaPool,
  isMariaDbConfigured,
  isMariaDbSchemaMissingError,
  logMariaSchemaMigrateHint,
} from "@/lib/db/mariadb";

export const SITE_SETTING_LANDING = "landing";

export async function getSiteSettingJson(
  key: string
): Promise<unknown | null> {
  if (!isMariaDbConfigured()) return null;
  const pool = getMariaPool();
  if (!pool) return null;

  let rows: RowDataPacket[];
  try {
    const result = await pool.query<RowDataPacket[]>(
      "SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1",
      [key]
    );
    rows = result[0];
  } catch (e) {
    if (isMariaDbSchemaMissingError(e)) {
      logMariaSchemaMigrateHint("site_settings");
      return null;
    }
    throw e;
  }
  if (!rows?.length) return null;
  const raw = rows[0].setting_value;
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  return raw;
}

export async function setSiteSettingJson(
  key: string,
  value: unknown
): Promise<void> {
  if (!isMariaDbConfigured()) {
    throw new Error("MariaDB is not configured");
  }
  const pool = getMariaPool();
  if (!pool) throw new Error("MariaDB pool unavailable");

  const json = JSON.stringify(value);
  try {
    await pool.query(
      `INSERT INTO site_settings (setting_key, setting_value) VALUES (?, CAST(? AS JSON))
     ON DUPLICATE KEY UPDATE setting_value = CAST(? AS JSON), updated_at = CURRENT_TIMESTAMP`,
      [key, json, json]
    );
  } catch (e) {
    if (isMariaDbSchemaMissingError(e)) {
      throw new Error(
        "site_settings table missing — run npm run db:migrate (see migrations/001_initial.sql)"
      );
    }
    throw e;
  }
}

export async function getResolvedLandingConfig(): Promise<LandingBrandingConfig> {
  const raw = await getSiteSettingJson(SITE_SETTING_LANDING);
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_LANDING_CONFIG };
  }
  return mergeLandingConfig(raw as Partial<LandingBrandingConfig>);
}

export async function patchLandingConfig(
  patch: Partial<LandingBrandingConfig>
): Promise<LandingBrandingConfig> {
  const raw = await getSiteSettingJson(SITE_SETTING_LANDING);
  const prev =
    raw && typeof raw === "object"
      ? mergeLandingConfig(raw as Partial<LandingBrandingConfig>)
      : { ...DEFAULT_LANDING_CONFIG };
  const next = mergeLandingConfig({ ...prev, ...patch });
  await setSiteSettingJson(SITE_SETTING_LANDING, next);
  return next;
}
