# @nexusworld3d/content-schema

**EN.** Zod schemas for **`content/manifest.json`** and **scene documents v0.1** (`content/scenes/*.json`). Exports: `parseContentManifestV1`, `parseSceneDocumentV0_1`, matching schemas and types.

**ES.** El CLI **`npm run validate-content`** y **`npm run validate-scene`**, más el loader de manifest en runtime, usan este paquete.

## Usage / Uso

```ts
import { parseContentManifestV1 } from "@nexusworld3d/content-schema";

const manifest = parseContentManifestV1(JSON.parse(raw));
```

Add optional sections to the manifest as needed; unknown top-level keys are allowed (`.passthrough()`).

### Scene v0.1 / Escena v0.1

```ts
import { parseSceneDocumentV0_1 } from "@nexusworld3d/content-schema";

const scene = parseSceneDocumentV0_1(JSON.parse(raw));
```

See [`docs/adr/0001-scene-format-v0-1.md`](../../docs/adr/0001-scene-format-v0-1.md) and example `content/scenes/starter.v0_1.json`.
