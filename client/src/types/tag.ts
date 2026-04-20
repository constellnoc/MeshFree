export type TagScopeLevel = "broad" | "medium" | "specific";

export interface PublicTag {
  slug: string;
  label: string;
  scopeLevel: TagScopeLevel;
}

export interface AdminRawTag {
  id: number;
  value: string;
  status: "pending" | "resolved" | "ignored";
  resolvedTag: PublicTag | null;
}
