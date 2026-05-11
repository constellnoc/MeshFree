import { http } from "./http";
import type {
  AdminLoginPayload,
  AdminLoginResult,
  AdminSessionResult,
  AdminSubmissionDetail,
  AdminSubmissionStatus,
  AdminSubmissionSummary,
} from "../types/admin";
import type { AppLocale } from "../lib/i18n";
import type { ManagedTagPayload, PublicTag } from "../types/tag";

const legacyAdminTokenStorageKey = "meshfree_admin_token";

export function clearLegacyAdminToken() {
  localStorage.removeItem(legacyAdminTokenStorageKey);
}

export async function loginAsAdmin(payload: AdminLoginPayload) {
  const response = await http.post<AdminLoginResult>("/admin/login", payload);
  clearLegacyAdminToken();
  return response.data;
}

export async function logoutAdmin() {
  try {
    const response = await http.post<{ message: string }>("/admin/logout");
    return response.data;
  } finally {
    clearLegacyAdminToken();
  }
}

export async function getAdminSession() {
  clearLegacyAdminToken();
  const response = await http.get<AdminSessionResult>("/admin/session");
  return response.data;
}

export async function getAdminSubmissions(status?: AdminSubmissionStatus, locale: AppLocale = "en") {
  const response = await http.get<AdminSubmissionSummary[]>("/admin/submissions", {
    params: status ? { status, locale } : { locale },
  });

  return response.data;
}

export async function getAdminSubmissionDetail(id: number, locale: AppLocale = "en") {
  const response = await http.get<AdminSubmissionDetail>(`/admin/submissions/${id}`, {
    params: { locale },
  });

  return response.data;
}

export async function approveSubmission(id: number) {
  const response = await http.patch<{ message: string }>(
    `/admin/submissions/${id}/approve`,
    undefined,
  );

  return response.data;
}

export async function rejectSubmission(id: number, rejectReason: string) {
  const response = await http.patch<{ message: string }>(
    `/admin/submissions/${id}/reject`,
    { rejectReason },
  );

  return response.data;
}

export async function deleteSubmission(id: number) {
  const response = await http.delete<{ message: string }>(`/admin/submissions/${id}`);

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
      params: { locale },
    },
  );

  return response.data;
}

export async function createAdminTag(payload: ManagedTagPayload, locale: AppLocale = "en") {
  const response = await http.post<{
    message: string;
    tag: PublicTag;
  }>("/admin/tags", payload, {
    params: { locale },
  });

  return response.data;
}

export async function ignoreAdminRawTag(rawTagId: number, locale: AppLocale = "en") {
  const response = await http.patch<{
    message: string;
    submission: AdminSubmissionDetail;
  }>(`/admin/raw-tags/${rawTagId}/ignore`, undefined, {
    params: { locale },
  });

  return response.data;
}

export async function resolveAdminRawTagToExisting(rawTagId: number, tagSlug: string, locale: AppLocale = "en") {
  const response = await http.patch<{
    message: string;
    submission: AdminSubmissionDetail;
  }>(
    `/admin/raw-tags/${rawTagId}/resolve-existing`,
    { tagSlug },
    {
      params: { locale },
    },
  );

  return response.data;
}

export async function createAdminTagFromRawTag(rawTagId: number, payload: ManagedTagPayload, locale: AppLocale = "en") {
  const response = await http.post<{
    message: string;
    submission: AdminSubmissionDetail;
  }>(`/admin/raw-tags/${rawTagId}/create-tag`, payload, {
    params: { locale },
  });

  return response.data;
}

export async function downloadAdminSubmissionZip(id: number) {
  const response = await http.get<Blob>(`/admin/submissions/${id}/download`, {
    responseType: "blob",
  });

  return response.data;
}

export async function getAdminSubmissionCover(id: number) {
  const response = await http.get<Blob>(`/admin/submissions/${id}/cover`, {
    responseType: "blob",
  });

  return response.data;
}
