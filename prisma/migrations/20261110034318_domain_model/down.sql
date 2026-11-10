-- Hand-written rollback for `20261110034318_domain_model` (plan §3.3).
--
-- Prisma has no `migrate down`, which is exactly why this file exists. It is
-- NOT executed by Prisma. To roll back:
--
--   1. psql "$DIRECT_DATABASE_URL" -f prisma/migrations/20261110034318_domain_model/down.sql
--   2. pnpm exec prisma migrate resolve --rolled-back 20261110034318_domain_model
--
-- Data loss is expected and acceptable: every row is generated demo data that
-- `pnpm db:seed` recreates (TD-006, TD-010).

-- Drop tables in reverse foreign-key order.
DROP TABLE IF EXISTS "Transaction";
DROP TABLE IF EXISTS "Transfer";
DROP TABLE IF EXISTS "Card";
DROP TABLE IF EXISTS "Counterparty";
DROP TABLE IF EXISTS "Category";
DROP TABLE IF EXISTS "Account";
DROP TABLE IF EXISTS "User";
DROP TABLE IF EXISTS "Business";

-- Drop the enum types the tables depended on.
DROP TYPE IF EXISTS "CategoryDirection";
DROP TYPE IF EXISTS "CardStatus";
DROP TYPE IF EXISTS "CardFormFactor";
DROP TYPE IF EXISTS "CounterpartyKind";
DROP TYPE IF EXISTS "TransactionMethod";
DROP TYPE IF EXISTS "TransactionStatus";
DROP TYPE IF EXISTS "AccountType";
DROP TYPE IF EXISTS "UserRole";

-- Restore feature 000's throwaway table, so the previous migration state is
-- reproduced exactly (it holds no business data).
CREATE TABLE "SkeletonCheck" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkeletonCheck_pkey" PRIMARY KEY ("id")
);
