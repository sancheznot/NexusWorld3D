import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type RequiredModelAsset = {
  path: string;
  url: string;
  shippedInRepo?: boolean;
  optional?: boolean;
  usedBy?: string[];
};

export type RequiredModelsTier = {
  label?: string;
  description?: string;
  assets: RequiredModelAsset[];
};

export type RequiredModelsManifest = {
  version: number;
  description?: string;
  tiers: Record<string, RequiredModelsTier>;
};

export const REQUIRED_MODEL_TIER_ORDER: Record<string, string[]> = {
  boot: ["boot"],
  demo: ["boot", "demo"],
  full: ["boot", "demo", "full"],
};

export type RequiredModelCheckResult = {
  tier: string;
  missing: RequiredModelAsset[];
  optionalMissing: RequiredModelAsset[];
  present: RequiredModelAsset[];
};

export function getRequiredModelsManifestPath(repoRoot: string): string {
  return join(repoRoot, "content", "required-models.json");
}

export function loadRequiredModelsManifest(
  repoRoot: string
): RequiredModelsManifest {
  const manifestPath = getRequiredModelsManifestPath(repoRoot);
  if (!existsSync(manifestPath)) {
    throw new Error(`Missing ${manifestPath}`);
  }
  return JSON.parse(readFileSync(manifestPath, "utf8")) as RequiredModelsManifest;
}

export function checkRequiredModels(
  repoRoot: string,
  tierName: string
): RequiredModelCheckResult {
  const tiersToCheck = REQUIRED_MODEL_TIER_ORDER[tierName];
  if (!tiersToCheck) {
    throw new Error(`Unknown tier "${tierName}". Use: boot | demo | full`);
  }

  const manifest = loadRequiredModelsManifest(repoRoot);
  const assets: RequiredModelAsset[] = [];

  for (const key of tiersToCheck) {
    const tier = manifest.tiers[key];
    if (!tier) throw new Error(`Manifest missing tier "${key}"`);
    assets.push(...tier.assets);
  }

  const missing: RequiredModelAsset[] = [];
  const optionalMissing: RequiredModelAsset[] = [];
  const present: RequiredModelAsset[] = [];

  for (const asset of assets) {
    const abs = join(repoRoot, asset.path);
    if (existsSync(abs)) {
      present.push(asset);
      continue;
    }
    if (asset.optional) optionalMissing.push(asset);
    else missing.push(asset);
  }

  return { tier: tierName, missing, optionalMissing, present };
}

/** ES: Tier según modo demo del cliente. EN: Client tier from NEXT_PUBLIC_FRAMEWORK_DEMO. */
export function resolveRequiredModelsTierForClient(
  frameworkDemo: boolean
): "demo" | "full" {
  return frameworkDemo ? "demo" : "full";
}
