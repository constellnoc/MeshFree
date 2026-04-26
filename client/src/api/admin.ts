import { http } from "./http";
import type {
  AdminLoginPayload,
  AdminLoginResult,
  AdminSubmissionDetail,
  AdminSubmissionStatus,
  AdminSubmissionSummary,
} from "../types/admin";
import type { AppLocale } from "../lib/i18n";

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

export function getAdminDisplayName() {
  const token = getAdminToken();

  if (!token) {
    return null;
  }

  try {
    const [, payload] = token.split(".");

    if (!payload) {
      return null;
    }

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      "=",
    );
    const decodedPayload = atob(paddedPayload);
    const parsedPayload = JSON.parse(decodedPayload) as { username?: unknown };

    return typeof parsedPayload.username === "string" ? parsedPayload.username : null;
  } catch {
    return null;
  }
}

export async function loginAsAdmin(payload: AdminLoginPayload) {
  const response = await http.post<AdminLoginResult>("/admin/login", payload);
  return response.data;
}

export async function getAdminSubmissions(status?: AdminSubmissionStatus, locale: AppLocale = "en") {
  const response = await http.get<AdminSubmissionSummary[]>("/admin/submissions", {
    headers: getAuthHeaders(),
    params: status ? { status, locale } : { locale },
  });

  return response.data;
}

export async function getAdminSubmissionDetail(id: number, locale: AppLocale = "en") {
  const response = await http.get<AdminSubmissionDetail>(`/admin/submissions/${id}`, {
    headers: getAuthHeaders(),
    params: { locale },
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

export async function updateSubmissionTags(
  id: number,
  selectedTagSlugs: string[],
  locale: AppLocale = "en",
) {
  const response = await http.patch<{
    message: string;
    submission: AdminSubmissionDetail;
  }>(
    `/admin/submissions/${id}/tags`,
    { selectedTagSlugs },
    {
      headers: getAuthHeaders(),
      params: { locale },
    },
  );

  return response.data;
}

export async function downloadAdminSubmissionZip(id: number) {
  const response = await http.get<Blob>(`/admin/submissions/${id}/download`, {
    headers: getAuthHeaders(),
    responseType: "blob",
  });

  return response.data;
}
