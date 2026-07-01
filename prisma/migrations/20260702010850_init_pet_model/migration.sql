-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "PetCategory" AS ENUM ('REGISTERED', 'LOST', 'FOUND', 'ADOPTION');

-- CreateEnum
CREATE TYPE "Species" AS ENUM ('DOG', 'CAT', 'OTHER');

-- CreateEnum
CREATE TYPE "PetSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PetStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "pets" (
    "id" TEXT NOT NULL,
    "category" "PetCategory" NOT NULL,
    "species" "Species" NOT NULL,
    "size" "PetSize",
    "gender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
    "status" "PetStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" TEXT,
    "breed" TEXT,
    "color" TEXT,
    "age" INTEGER,
    "region" TEXT,
    "description" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contactName" TEXT,
    "contactPhone" TEXT,
    "imageEmbedding" vector(512),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pets_category_status_idx" ON "pets"("category", "status");

-- CreateIndex
CREATE INDEX "pets_species_idx" ON "pets"("species");

-- CreateIndex
CREATE INDEX "pets_region_idx" ON "pets"("region");

-- CreateIndex (raw SQL): ivfflat cosine-distance index for pgvector similarity search.
-- Prisma cannot express operator classes, so this is added manually.
-- `lists` is kept small for the prototype's low data volume (better recall at the
-- default probes=1). Rebuild/REINDEX after seeding real data (M8) for best recall.
CREATE INDEX "pets_imageEmbedding_idx"
    ON "pets" USING ivfflat ("imageEmbedding" vector_cosine_ops)
    WITH (lists = 10);

