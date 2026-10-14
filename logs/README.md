# Runtime error logs

This folder documents how errors are handled. **Production runtime errors are not written into this Git repository automatically.**

Vercel serverless functions run on temporary instances. Files created at runtime are ephemeral and do not become Git commits.

For Unmask, runtime failures are persisted to the Supabase table:

`public.app_error_logs`

Each server-side failure can include:
- source
- route
- error code / error ID
- safe error message
- non-secret context
- timestamp

Secrets, passwords, verification codes and tokens must never be written to the table.

The API also continues to use `console.error`, so the same failure can be inspected in Vercel Runtime Logs.

## Debug flow

1. Reproduce the issue.
2. Copy the visible `errorId` if one is shown.
3. Query `public.app_error_logs` by `code` or latest `created_at`.
4. If no Supabase log exists, inspect Vercel Runtime Logs because the function may have failed before it could connect to Supabase.
5. Use `/api/health` to verify that required Vercel environment variables are present without exposing their values.
