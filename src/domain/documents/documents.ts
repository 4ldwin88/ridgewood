export type DocumentLifecyclePackage =
  | 'opportunity_qualification'
  | 'preconstruction'
  | 'authorization'
  | 'project_construction'
  | 'closeout_warranty';

export type DocumentRevisionStatus =
  | 'draft'
  | 'published'
  | 'superseded'
  | 'withdrawn'
  | 'rejected';

export interface DocumentRecord {
  id: string;
  projectStateId: string;
  lifecyclePackage: DocumentLifecyclePackage;
  category: string;
  documentType: string;
  title: string;
  currentPublishedRevisionId?: string;
}

export interface DocumentRevision {
  id: string;
  documentId: string;
  revisionNumber: number;
  status: DocumentRevisionStatus;
  draftData: Record<string, unknown>;
  publishedSourceSnapshot?: Record<string, unknown>;
  basedOnRevisionId?: string;
  supersedesRevisionId?: string;
  storageBucket?: string;
  storageObjectKey?: string;
  artifactMimeType?: string;
  artifactSha256?: string;
  publishedAt?: string;
  archivedAt?: string;
  archiveReason?: string;
}

export interface DocumentSelection {
  documentRevisionIds: string[];
}

export interface DocumentPackageManifest {
  id: string;
  packageKey: DocumentLifecyclePackage | string;
  documentRevisionIds: string[];
  generatedAt: string;
}

export function canEditRevision(revision: DocumentRevision): boolean {
  return revision.status === 'draft';
}

export function createDraftFromPublishedRevision(
  published: DocumentRevision,
  newRevisionId: string,
  nextRevisionNumber: number,
): DocumentRevision {
  if (published.status !== 'published' && published.status !== 'superseded') {
    throw new Error('A revision draft can only be created from an issued revision.');
  }

  const source = published.publishedSourceSnapshot ?? published.draftData;
  return {
    id: newRevisionId,
    documentId: published.documentId,
    revisionNumber: nextRevisionNumber,
    status: 'draft',
    draftData: structuredClone(source),
    basedOnRevisionId: published.id,
    supersedesRevisionId: published.id,
  };
}
