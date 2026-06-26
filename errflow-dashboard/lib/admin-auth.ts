import { NextRequest } from "next/server";

const ADMIN_API_BASE =
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3001"
    : process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
      "https://www.errflow.dev") + "/api";
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AdminAuthResponse {
  admin: AdminUser;
  accessToken: string;
  refreshToken: string;
}

class AdminApiClient {
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  private getAuthHeaders(): HeadersInit {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("adminAccessToken");
      if (token) {
        return {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        };
      }
    }

    return {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 401) {
        const refreshSuccess = await this.refreshToken();
        if (refreshSuccess) {
          throw new Error("TOKEN_REFRESHED");
        } else {
          this.redirectToLogin();
          throw new Error("Authentication failed");
        }
      }

      const error = await response
        .json()
        .catch(() => ({ message: "Request failed" }));
      throw new Error(
        error.message || `Request failed with status ${response.status}`,
      );
    }

    return response.json();
  }

  private async refreshToken(): Promise<boolean> {
    if (typeof window === "undefined") return false;

    const refreshToken = localStorage.getItem("adminRefreshToken");
    if (!refreshToken) return false;

    try {
      const tokens = await this.refreshTokens(refreshToken);
      localStorage.setItem("adminAccessToken", tokens.accessToken);
      localStorage.setItem("adminRefreshToken", tokens.refreshToken);
      return true;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      return false;
    }
  }

  private redirectToLogin(): void {
    if (typeof window === "undefined") return;

    localStorage.removeItem("adminAccessToken");
    localStorage.removeItem("adminRefreshToken");
    localStorage.removeItem("adminUser");
    window.location.href = "/admin/login";
  }

  private async requestWithRetry<T>(
    method: string,
    path: string,
    body?: any,
    retries = 1,
  ): Promise<T> {
    try {
      return await this.makeRequest<T>(method, path, body);
    } catch (error: any) {
      if (error.message === "TOKEN_REFRESHED" && retries > 0) {
        return this.requestWithRetry<T>(method, path, body, retries - 1);
      }
      throw error;
    }
  }

  private async makeRequest<T>(
    method: string,
    path: string,
    body?: any,
  ): Promise<T> {
    const url = path.startsWith("http") ? path : `${ADMIN_API_BASE}${path}`;
    const response = await fetch(url, {
      method,
      headers: this.getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, body?: any): Promise<T> {
    return this.requestWithRetry<T>("POST", path, body);
  }

  async get<T>(
    path: string,
    params?: Record<string, string | number>,
  ): Promise<T> {
    const url = new URL(`${ADMIN_API_BASE}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    url.searchParams.append("_t", Date.now().toString());

    return this.requestWithRetry<T>("GET", url.href);
  }

  async put<T>(path: string, body?: any): Promise<T> {
    return this.requestWithRetry<T>("PUT", path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.requestWithRetry<T>("DELETE", path);
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // ✅ /auth/refresh العادي مش /admin/auth/refresh
    const response = await fetch(`${ADMIN_API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh tokens");
    }

    return response.json();
  }

  async logout(accessToken: string): Promise<void> {
    // ✅ /auth/logout العادي مش /admin/auth/logout
    await fetch(`${ADMIN_API_BASE}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
}

export const adminApi = new AdminApiClient();

export const getAdminUser = (): AdminUser | null => {
  if (typeof window === "undefined") return null;

  const userStr = localStorage.getItem("adminUser");
  if (!userStr || userStr === "undefined") return null;

  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error("Failed to parse admin user from localStorage:", error);
    localStorage.removeItem("adminUser");
    return null;
  }
};

export const getAdminToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return getAdminUser() ? "cookie-authenticated" : null;
};

export const isAdminAuthenticated = (): boolean => {
  return !!getAdminUser();
};

export const adminLogout = () => {
  if (typeof window === "undefined") return;

  const token = getAdminToken();
  if (token) {
    adminApi.logout(token).catch(() => {});
  }

  localStorage.removeItem("adminAccessToken");
  localStorage.removeItem("adminRefreshToken");
  localStorage.removeItem("adminUser");

  window.location.href = "/admin/login";
};

export const refreshAdminToken = async (): Promise<boolean> => {
  if (typeof window === "undefined") return false;

  const refreshToken = localStorage.getItem("adminRefreshToken");
  if (!refreshToken) return false;

  try {
    const tokens = await adminApi.refreshTokens(refreshToken);
    localStorage.setItem("adminAccessToken", tokens.accessToken);
    localStorage.setItem("adminRefreshToken", tokens.refreshToken);
    return true;
  } catch (error) {
    console.error("Failed to refresh admin token:", error);
    adminLogout();
    return false;
  }
};

export async function getAdminServerSession(request: NextRequest) {
  const token = request.cookies.get("adminAccessToken")?.value;

  if (!token) return null;

  try {
    const response = await fetch(`${ADMIN_API_BASE}/admin/auth/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.admin;
  } catch (error) {
    console.error("Failed to verify admin token:", error);
    return null;
  }
}