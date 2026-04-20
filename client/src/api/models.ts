import { http } from "./http";
import type { ModelDetail, ModelSummary } from "../types/model";

interface GetApprovedModelsParams {
  q?: string;
  tag?: string;
  locale?: string;
}

export async function getApprovedModels(params?: GetApprovedModelsParams) {
  const response = await http.get<ModelSummary[]>("/models", {
    params,
  });
  return response.data;
}

export async function getApprovedModelDetail(id: string, locale?: string) {
  const response = await http.get<ModelDetail>(`/models/${id}`, {
    params: locale ? { locale } : undefined,
  });
  return response.data;
}
