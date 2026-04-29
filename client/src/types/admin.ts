import type { AdminRawTag, PublicTag } from "./tag";

export type AdminSubmissionStatus = "pending" | "approved" | "rejected";
export type SubmissionSourceFormat = "obj" | "fbx" | "dae" | "blend" | "glb" | "unknown";
export type SubmissionPreviewConversionStatus = "not_attempted" | "success" | "warning" | "failed";

export interface AdminLoginPayload {
  username: string;
  password: string;
}

export interface AdminLoginResult {
  message: string;
  token: string;
}

export interface AdminSubmissionSummary {
  id: number;
  title: string;
  description: string;
  contact: string;
  coverImageUrl: string;
  status: AdminSubmissionStatus;
  rejectReason: string | null;
  sourceFormat: SubmissionSourceFormat;
  previewConversionStatus: SubmissionPreviewConversionStatus;
  previewConversionMessage: string | null;
  isPreviewEnabled: boolean;
  isPublicVisible: boolean;
  hasMissingTextures: boolean;
  createdAt: string;
  reviewedAt: string | null;
  tags: PublicTag[];
}

export interface AdminSubmissionDetail extends AdminSubmissionSummary {
  modelZipName: string;
  rawTags: AdminRawTag[];
}
