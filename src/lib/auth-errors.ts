import { isAuthSessionMissingError } from "@supabase/supabase-js";

// Only known invalid-session errors mean the visitor needs to sign in again.
// Network, configuration and service errors must remain distinguishable.
export function needsSignIn(error: { code?: string } | null): boolean {
  if (!error) return false;
  return isAuthSessionMissingError(error) || [
    "session_not_found",
    "session_expired",
    "refresh_token_not_found",
    "refresh_token_already_used",
    "bad_jwt",
    "user_not_found",
  ].includes(error.code ?? "");
}
