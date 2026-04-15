import axios from "axios";

import type { SubmissionResult } from "../types/submission";

const uploadHttp = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

export async function createSubmission(formData: FormData) {
  const response = await uploadHttp.post<SubmissionResult>("/submissions", formData);
  return response.data;
}
