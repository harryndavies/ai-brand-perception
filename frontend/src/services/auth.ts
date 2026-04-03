import { get, post, put, del } from "@/lib/api";
import type { User } from "@/types";

interface AuthResponse {
  user: User;
  token: string;
}

interface ApiKeySaveResponse {
  provider: string;
  saved: boolean;
}

interface ApiKeyDeleteResponse {
  provider: string;
  removed: boolean;
}

/** Authenticate with email and password. */
export function login(email: string, password: string): Promise<AuthResponse> {
  return post<AuthResponse>("auth/login", { email, password });
}

/** Create a new account. */
export function signup(name: string, email: string, password: string): Promise<AuthResponse> {
  return post<AuthResponse>("auth/signup", { name, email, password });
}

/** Fetch the currently authenticated user. */
export function getMe(): Promise<User> {
  return get<User>("auth/me");
}

/** Store an encrypted API key for the given provider. */
export function setApiKey(provider: string, apiKey: string): Promise<ApiKeySaveResponse> {
  return put<ApiKeySaveResponse>("auth/api-key", { provider, api_key: apiKey });
}

/** Remove the stored API key for the given provider. */
export function deleteApiKey(provider: string): Promise<ApiKeyDeleteResponse> {
  return del<ApiKeyDeleteResponse>(`auth/api-key/${provider}`);
}
