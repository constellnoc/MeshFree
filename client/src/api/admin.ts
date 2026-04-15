import { http } from "./http";
import type {
  AdminLoginPayload,
  AdminLoginResult,
  AdminSubmissionDetail,
  AdminSubmissionStatus,
  AdminSubmissionSummary,
} from "../types/admin";

export const adminTokenStorageKey = "meshfree_admin_token";

function getAuthHeaders() {
  const token = localStorage.getItem(adminTokenStorageKey);

  if (!token) {
    throw new Error("No admin token found.");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

export function getAdminToken() {
  return localStorage.getItem(adminTokenStorageKey);
}

export function setAdminToken(token: string) {
  localStorage.setItem(adminTokenStorageKey, token);
}

export function clearAdminToken() {
  localStorage.removeItem(adminTokenStorageKey);
}

export async function loginAsAdmin(payload: AdminLoginPayload) {
  const response = await http.post<AdminLoginResult>("/admin/login", payload);
  return response.data;
}

export async function getAdminSubmissions(status?: AdminSubmissionStatus) {
  const response = await http.get<AdminSubmissionSummary[]>("/admin/submissions", {
    headers: getAuthHeaders(),
    params: status ? { status } : undefined,
  });

  return response.data;
}

export async function getAdminSubmissionDetail(id: number) {
  const response = await http.get<AdminSubmissionDetail>(`/admin/submissions/${id}`, {
    headers: getAuthHeaders(),
  });

  return response.data;
}

export async function approveSubmission(id: number) {
  const response = await http.patch<{ message: string }>(
    `/admin/submissions/${id}/approve`,
    undefined,
    {
      headers: getAuthHeaders(),
    },
  );

  return response.data;
}

export async function rejectSubmission(id: number, rejectReason: string) {
  const response = await http.patch<{ message: string }>(
    `/admin/submissions/${id}/reject`,
    { rejectReason },
    {
      headers: getAuthHeaders(),
    },
  );

  return response.data;
}

export async function deleteSubmission(id: number) {
  const response = await http.delete<{ message: string }>(`/admin/submissions/${id}`, {
    headers: getAuthHeaders(),
  });

  return response.data;
}
