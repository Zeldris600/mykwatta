import {
  SALE_TITLE_CHECKLIST_TYPES,
  TitleDocumentStatus,
  type TitleDocumentType,
  type TitleStatus,
} from '@mykwatta/modules/listings/constants';

export type BuyerTitleChecklistItem = {
  documentType: TitleDocumentType;
  documentId: string | null;
  status: TitleDocumentStatus | null;
};

/** Shown on SALE listing detail so buyers can see deed progress. */
export type BuyerTitleChecklist = {
  documentsVerifiedByMykwatta: boolean;
  titleStatus: TitleStatus;
  items: BuyerTitleChecklistItem[];
};

const STATUS_RANK: Record<TitleDocumentStatus, number> = {
  [TitleDocumentStatus.APPROVED]: 3,
  [TitleDocumentStatus.PENDING]: 2,
  [TitleDocumentStatus.REJECTED]: 1,
};

export function buildBuyerTitleChecklist(
  listing: {
    titleStatus: TitleStatus;
    documentsVerifiedByMykwatta: boolean;
  },
  documents: Array<{
    id: string;
    documentType: TitleDocumentType;
    status: TitleDocumentStatus;
  }>,
): BuyerTitleChecklist {
  const bestByType = new Map<TitleDocumentType, (typeof documents)[number]>();
  for (const row of documents) {
    const current = bestByType.get(row.documentType);
    if (!current || STATUS_RANK[row.status] > STATUS_RANK[current.status]) {
      bestByType.set(row.documentType, row);
    }
  }

  return {
    documentsVerifiedByMykwatta: listing.documentsVerifiedByMykwatta,
    titleStatus: listing.titleStatus,
    items: SALE_TITLE_CHECKLIST_TYPES.map((documentType) => {
      const match = bestByType.get(documentType);
      return {
        documentType,
        documentId: match?.id ?? null,
        status: match?.status ?? null,
      };
    }),
  };
}
