import assert from "node:assert/strict";
import test from "node:test";
import { AuthSessionMissingError } from "@supabase/supabase-js";
import { needsSignIn } from "../src/lib/auth-errors.ts";

test("missing and revoked sessions require login", () => {
  assert.equal(needsSignIn(new AuthSessionMissingError()), true);
  for (const code of ["session_not_found", "session_expired", "refresh_token_not_found", "refresh_token_already_used", "bad_jwt", "user_not_found"]) {
    assert.equal(needsSignIn({ code }), true);
  }
});

test("outages and unknown errors must not be treated as signed-out sessions", () => {
  for (const error of [null, {}, { code: "unexpected_failure" }, { code: "request_timeout" }, { code: "over_request_rate_limit" }]) {
    assert.equal(needsSignIn(error), false);
  }
});
