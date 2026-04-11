import { http } from "./http";

export async function getModelsPlaceholder() {
  const response = await http.get("/models");
  return response.data;
}

export async function getModelDetailPlaceholder(id: string) {
  const response = await http.get(`/models/${id}`);
  return response.data;
}
