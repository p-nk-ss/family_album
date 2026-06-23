import "dotenv/config"

// Force deterministic fake R2 env for tests — overrides any real (possibly malformed) creds.
// Phase 1: presigning is local crypto, so these tests are hermetic.
process.env.R2_ACCOUNT_ID = "testacct"
process.env.R2_ACCESS_KEY_ID = "testkey"
process.env.R2_SECRET_ACCESS_KEY = "testsecret"
process.env.R2_BUCKET = "test-bucket"
process.env.R2_ENDPOINT = "https://testacct.r2.cloudflarestorage.com"
