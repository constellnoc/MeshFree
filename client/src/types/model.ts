export interface ModelSummary {
  id: number;
  title: string;
  description: string;
  coverImageUrl: string;
  createdAt: string;
  tags: string[];
}

export interface ModelDetail extends ModelSummary {
  previewModelUrl: string | null;
}
