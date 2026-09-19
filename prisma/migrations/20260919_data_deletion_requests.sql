-- 2026-09-19 — Meta data-deletion callback storage.
--
-- Meta POSTs a signed_request identifying the person by their Facebook numeric
-- user id and nothing else, so the account lookup needs that id stored on the
-- user row. ImageCrafter has no identities table (ic_User.id IS the Clerk id),
-- so the id lands on ic_User, populated from the Clerk webhook's
-- external_accounts[] where provider = "oauth_facebook".
--
-- Strictly additive: one new table + one new nullable column.
--
-- Every object is schema-qualified: this role's search_path is
-- "launchcraft, public", so an unqualified CREATE lands in launchcraft while
-- Prisma reads from imagecrafter.

BEGIN;

ALTER TABLE imagecrafter."ic_User"
  ADD COLUMN IF NOT EXISTS "facebookUserId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ic_User_facebookUserId_key"
  ON imagecrafter."ic_User" ("facebookUserId");

CREATE TABLE IF NOT EXISTS imagecrafter."ic_DataDeletionRequest" (
  "id"               TEXT PRIMARY KEY,
  "userId"           TEXT,
  "facebookUserId"   TEXT NOT NULL,
  "confirmationCode" TEXT NOT NULL UNIQUE,
  "status"           TEXT NOT NULL DEFAULT 'pending',
  "platform"         TEXT NOT NULL DEFAULT 'facebook',
  "requestedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt"      TIMESTAMP(3),
  "completedAt"      TIMESTAMP(3),
  "deletionDetails"  JSONB NOT NULL DEFAULT '{}',
  "errorMessage"     TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "ic_DataDeletionRequest_confirmationCode_idx"
  ON imagecrafter."ic_DataDeletionRequest" ("confirmationCode");
CREATE INDEX IF NOT EXISTS "ic_DataDeletionRequest_facebookUserId_idx"
  ON imagecrafter."ic_DataDeletionRequest" ("facebookUserId");
CREATE INDEX IF NOT EXISTS "ic_DataDeletionRequest_status_idx"
  ON imagecrafter."ic_DataDeletionRequest" ("status");
CREATE INDEX IF NOT EXISTS "ic_DataDeletionRequest_userId_idx"
  ON imagecrafter."ic_DataDeletionRequest" ("userId");

COMMIT;
