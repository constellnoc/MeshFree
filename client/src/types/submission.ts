export interface SubmissionResult {
  message: string;
  submissionId: number;
  status: "pending" | "approved" | "rejected";
}
