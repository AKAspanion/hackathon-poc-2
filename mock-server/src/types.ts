import type { PrismaClient } from "@prisma/client";

export interface CreateCollectionInput {
  name: string;
  slug: string;
  description?: string;
  config?: Record<string, unknown>;
}

export interface UpdateCollectionInput {
  name?: string;
  slug?: string;
  description?: string;
  config?: Record<string, unknown>;
}

export interface ListOptions {
  limit: number;
  offset: number;
}

export interface AppLocals {
  prisma: PrismaClient;
}
