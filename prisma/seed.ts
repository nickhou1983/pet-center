import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { Prisma, PrismaClient } from "@prisma/client";
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
} from "@prisma/client/runtime/library";

import { getImageEmbedding } from "../lib/clip";
import { toVectorLiteral } from "../lib/vector";
import { SEED_PETS, type SeedPet } from "./seed-data";

const prisma = new PrismaClient();
const force = process.argv.includes("--force");

interface ExistingEmbeddingRow {
  hasEmbedding: boolean;
}

type PetCreateData = Prisma.PetUncheckedCreateInput;
type PetUpdateData = Prisma.PetUncheckedUpdateInput;

function photoFilePath(photoPath: string): string | null {
  const prefix = "/seed/";
  if (!photoPath.startsWith(prefix)) return null;
  const fileName = photoPath.slice(prefix.length);
  if (fileName.length === 0 || fileName.includes("/") || fileName.includes("..")) {
    return null;
  }
  return path.join(process.cwd(), "public", "seed", fileName);
}

function validateSeedPhotos(): Map<string, string> {
  const photoFiles = new Map<string, string>();
  const missing: string[] = [];

  for (const pet of SEED_PETS) {
    const firstPhoto = pet.photos[0];
    const filePath = firstPhoto ? photoFilePath(firstPhoto) : null;
    if (!filePath || !existsSync(filePath)) {
      missing.push(`${pet.id}: ${firstPhoto ?? "未配置图片"}`);
      continue;
    }
    photoFiles.set(pet.id, filePath);
  }

  if (missing.length > 0) {
    console.error("种子图片缺失或路径无效，请先确认 public/seed/ 下文件完整：");
    for (const item of missing) console.error(`- ${item}`);
    process.exit(1);
  }

  return photoFiles;
}

function createData(pet: SeedPet): PetCreateData {
  return {
    id: pet.id,
    category: pet.category,
    species: pet.species,
    size: pet.size,
    gender: pet.gender,
    status: "ACTIVE",
    name: pet.name,
    breed: pet.breed,
    color: pet.color,
    age: pet.age,
    region: pet.region,
    description: pet.description,
    photos: pet.photos,
    contactName: pet.contactName,
    contactPhone: pet.contactPhone,
  };
}

function updateData(pet: SeedPet): PetUpdateData {
  // update 中 undefined 表示"保持原值",可选字段需显式置 null 才能真正同步
  return {
    category: pet.category,
    species: pet.species,
    size: pet.size ?? null,
    gender: pet.gender,
    status: "ACTIVE",
    name: pet.name ?? null,
    breed: pet.breed ?? null,
    color: pet.color ?? null,
    age: pet.age ?? null,
    region: pet.region ?? null,
    description: pet.description,
    photos: pet.photos,
    contactName: pet.contactName ?? null,
    contactPhone: pet.contactPhone ?? null,
  };
}

async function hasExistingEmbedding(id: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<ExistingEmbeddingRow[]>`
    SELECT EXISTS(
      SELECT 1 FROM "pets" WHERE "id" = ${id} AND "imageEmbedding" IS NOT NULL
    ) AS "hasEmbedding"
  `;
  return rows[0]?.hasEmbedding ?? false;
}

function isDatabaseUnreachable(error: unknown): boolean {
  // 连接失败在客户端初始化阶段抛 PrismaClientInitializationError,
  // 已初始化后的查询阶段抛 PrismaClientKnownRequestError(code)。
  // 实测 Prisma 5.22 初始化错误的 errorCode 可能为 undefined,需按消息兜底。
  if (error instanceof PrismaClientInitializationError) {
    return (
      error.errorCode === "P1001" ||
      error.message.includes("Can't reach database server")
    );
  }
  return error instanceof PrismaClientKnownRequestError && error.code === "P1001";
}

function printDatabaseHint(error: unknown): void {
  if (isDatabaseUnreachable(error)) {
    console.error(
      "数据库连接失败。请先运行 npm run db:up，并等待 PostgreSQL 容器就绪后再执行 npm run db:seed。",
    );
    return;
  }

  console.error("种子数据写入失败：", error);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "缺少 DATABASE_URL。请复制 .env.example 为 .env 并配置 DATABASE_URL。建议使用 npm run db:seed（prisma db seed 会自动加载 .env）；直接运行 tsx 不会自动加载 .env。",
    );
    process.exit(1);
  }

  const photoFiles = validateSeedPhotos();
  let seeded = 0;
  let updated = 0;
  let clipHintPrinted = false;

  for (const pet of SEED_PETS) {
    const existsWithEmbedding = await hasExistingEmbedding(pet.id);

    if (existsWithEmbedding && !force) {
      await prisma.pet.upsert({
        where: { id: pet.id },
        update: updateData(pet),
        create: createData(pet),
      });
      updated += 1;
      console.log(`${pet.id} ${pet.category} updated`);
      continue;
    }

    if (!clipHintPrinted) {
      console.log("加载 CLIP 模型…（首次运行将下载约 300MB）");
      clipHintPrinted = true;
    }

    const filePath = photoFiles.get(pet.id);
    if (!filePath) throw new Error(`未找到已校验的图片路径：${pet.id}`);

    const buffer = await readFile(filePath);
    const vector = await getImageEmbedding(buffer);
    const literal = toVectorLiteral(vector);

    await prisma.$transaction(async (tx) => {
      await tx.pet.upsert({
        where: { id: pet.id },
        update: updateData(pet),
        create: createData(pet),
      });
      await tx.$executeRaw`UPDATE "pets" SET "imageEmbedding" = ${literal}::vector WHERE "id" = ${pet.id}`;
    });

    seeded += 1;
    console.log(`${pet.id} ${pet.category} seeded`);
  }

  const hint = seeded > 0 ? "" : "（已有向量,未重新推理;需强制重算请加 --force）";
  console.log(
    `完成：seeded ${seeded} / updated ${updated} / total ${SEED_PETS.length}${hint}`,
  );
}

main()
  .catch((error) => {
    printDatabaseHint(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
