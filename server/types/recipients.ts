export type CsvRecipientRow = {
  name?: string;
  email: string;
  tags?: string; // comma-separated
};

export type ImportSummary = {
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ line: number; message: string }>;
};

export type RecipientGroupDTO = {
  id: string;
  name: string;
  description?: string | null;
  membersCount?: number;
};
