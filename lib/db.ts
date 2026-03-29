import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prismaInstance: PrismaClient | null | undefined;
}

/**
 * Returns the PrismaClient singleton, or null if DATABASE_URL is not configured.
 * The client is created lazily on first call to avoid crashing at module load time.
 */
export function getPrismaClient(): PrismaClient | null {
  // Return cached instance (including cached null) if already resolved
  if (global.prismaInstance !== undefined) {
    return global.prismaInstance;
  }

  if (!process.env.DATABASE_URL) {
    console.warn('[db] DATABASE_URL is not set — Prisma is disabled. GraphQL queries requiring a database will return empty results.');
    global.prismaInstance = null;
    return null;
  }

  try {
    global.prismaInstance = new PrismaClient();
  } catch (err) {
    console.warn('[db] Failed to initialise PrismaClient:', err);
    global.prismaInstance = null;
  }

  return global.prismaInstance;
}
