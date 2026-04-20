import type { PublicTag } from "./tag";

export interface ModelSummary {
  id: number;
  title: string;
  description: string;
  coverImageUrl: string;
  createdAt: string;
  tags: PublicTag[];
}

export interface ModelDetail extends ModelSummary {
  previewModelUrl: string | null;
}
