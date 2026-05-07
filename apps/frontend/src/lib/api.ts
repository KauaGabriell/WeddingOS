const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Erro na requisição");
  }

  return response.json();
}

export const authApi = {
  loginWithToken: (token: string) =>
    apiFetch("/auth/guest/login/token", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  loginWithCode: (code: string) =>
    apiFetch("/auth/guest/login/code", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
};
