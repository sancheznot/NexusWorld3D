import type { SceneDocumentV0_1 } from '@nexusworld3d/content-schema';

export interface SceneLibraryState {
  worldId: string;
  draft: SceneDocumentV0_1 | null;
  draftRevision: string | null;
  published: SceneDocumentV0_1 | null;
  publishedRevision: string | null;
  revisions: { revision: string; createdAt: string }[];
}
