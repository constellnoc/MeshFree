import { http } from "./http";
import type { ModelDetail, ModelSummary } from "../types/model";

export async function getApprovedModels() {
  const response = await http.get<ModelSummary[]>("/models");
  return response.data;
}

export async function getApprovedModelDetail(id: string) {
  const response = await http.get<ModelDetail>(`/models/${id}`);
  return response.data;
}
