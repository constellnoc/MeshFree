import { http } from "./http";

export async function loginAsAdminPlaceholder() {
  const response = await http.post("/admin/login");
  return response.data;
}

export async function getAdminSubmissionsPlaceholder(token: string) {
  const response = await http.get("/admin/submissions", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}
