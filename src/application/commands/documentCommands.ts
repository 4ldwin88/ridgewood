import type {
  DocumentLifecyclePackage,
  DocumentRevision,
} from '../../domain/project/documents';

export interface CreateDocumentDraftCommand {
  type: 'CreateDocumentDraft';
  projectId?: string;
  opportunityId?: string;
  lifecyclePackage: DocumentLifecyclePackage;
  category: string;
  documentType: string;
  title: string;
  initialData?: Record<string, unknown>;
}

export interface UpdateDocumentDraftCommand {
  type: 'UpdateDocumentDraft';
  revisionId: string;
  data: Record<string, unknown>;
}

export interface PublishDocumentRevisionCommand {
  type: 'PublishDocumentRevision';
  revisionId: string;
  approvalBasis?: string;
}

export interface CreateRevisionFromPublishedCommand {
  type: 'CreateRevisionFromPublished';
  publishedRevisionId: string;
  reason?: string;
}

export interface BuildDocumentSetCommand {
  type: 'BuildDocumentSet';
  packageKey: string;
  selectedRevisionIds: string[];
}

export interface GenerateDocumentPackageCommand {
  type: 'GenerateDocumentPackage';
  selectedRevisionIds: string[];
  output: 'print' | 'download';
}

export function assertDraftEditable(revision: DocumentRevision): void {
  if (revision.status !== 'draft') {
    throw new Error(
      'Published and archived revisions are immutable. Create a new draft revision instead.',
    );
  }
}
