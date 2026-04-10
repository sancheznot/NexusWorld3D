# @nexusworld3d/content-schema

**EN.** Zod schemas for **`content/manifest.json`**. Primary export: `parseContentManifestV1`, `contentManifestV1Schema`, type `ContentManifestV1`.

**ES.** El CLI raíz **`npm run validate-content`** y el loader en runtime (`server/content/loadContentManifest.ts`) usan este paquete para no duplicar reglas.

## Usage / Uso

```ts
import { parseContentManifestV1 } from "@nexusworld3d/content-schema";

const manifest = parseContentManifestV1(JSON.parse(raw));
```

Add optional sections to the manifest as needed; unknown top-level keys are allowed (`.passthrough()`).
