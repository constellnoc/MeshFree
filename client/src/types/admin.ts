export type AdminSubmissionStatus = "pending" | "approved" | "rejected";

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
  createdAt: string;
  reviewedAt: string | null;
  tags: string[];
}

export interface AdminSubmissionDetail extends AdminSubmissionSummary {
  modelZipName: string;
}
