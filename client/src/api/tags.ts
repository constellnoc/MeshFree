import { http } from "./http";
import type { PublicTag } from "../types/tag";

interface GetPublicTagsParams {
  locale?: string;
}

export async function getPublicTags(params?: GetPublicTagsParams) {
  const response = await http.get<PublicTag[]>("/tags", {
    params,
  });

  return response.data;
}
