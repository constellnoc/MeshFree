import { http } from "./http";
import type { ModelDetail, ModelSummary } from "../types/model";

interface GetApprovedModelsParams {
  q?: string;
  tags?: string[];
  locale?: string;
}

export async function getApprovedModels(params?: GetApprovedModelsParams) {
  const searchParams = new URLSearchParams();

  if (params?.q) {
    searchParams.set("q", params.q);
  }

  if (params?.locale) {
    searchParams.set("locale", params.locale);
  }

  for (const tag of params?.tags ?? []) {
    searchParams.append("tag", tag);
  }

  const response = await http.get<ModelSummary[]>("/models", {
    params: searchParams,
  });
  return response.data;
}

export async function getApprovedModelDetail(id: string, locale?: string) {
  const response = await http.get<ModelDetail>(`/models/${id}`, {
    params: locale ? { locale } : undefined,
  });
  return response.data;
}
