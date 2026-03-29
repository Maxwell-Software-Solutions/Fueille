import { GraphQLError } from 'graphql';
import { getPrismaClient } from '@/lib/db';
import {
  identifyPlantsFromLayout,
  isPlantIdentificationAvailable,
  DEFAULT_IDENTIFICATION_CONFIG,
  type PlantIdentificationRequest,
} from '@/lib/domain';

const DB_UNAVAILABLE_MESSAGE = 'Database not available';

export const resolvers = {
  Query: {
    messages: async () => {
      const prisma = getPrismaClient();
      if (!prisma) return [];
      try {
        return await prisma.message.findMany({
          include: { author: true },
          orderBy: { createdAt: 'desc' },
        });
      } catch (err) {
        console.error('[resolvers] messages query failed:', err);
        return [];
      }
    },
    message: async (_: unknown, { id }: { id: string }) => {
      const prisma = getPrismaClient();
      if (!prisma) return null;
      try {
        return await prisma.message.findUnique({
          where: { id },
          include: { author: true },
        });
      } catch (err) {
        console.error('[resolvers] message query failed:', err);
        return null;
      }
    },
    users: async () => {
      const prisma = getPrismaClient();
      if (!prisma) return [];
      try {
        return await prisma.user.findMany();
      } catch (err) {
        console.error('[resolvers] users query failed:', err);
        return [];
      }
    },
    plantIdentificationAvailable: async () => {
      return isPlantIdentificationAvailable();
    },
  },
  Mutation: {
    createMessage: async (_: unknown, { text, authorId }: { text: string; authorId?: string }) => {
      const prisma = getPrismaClient();
      if (!prisma) {
        throw new GraphQLError(DB_UNAVAILABLE_MESSAGE, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      try {
        return await prisma.message.create({
          data: { text, authorId },
          include: { author: true },
        });
      } catch (err) {
        console.error('[resolvers] createMessage mutation failed:', err);
        throw new GraphQLError(DB_UNAVAILABLE_MESSAGE, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
    },
    deleteMessage: async (_: unknown, { id }: { id: string }) => {
      const prisma = getPrismaClient();
      if (!prisma) {
        throw new GraphQLError(DB_UNAVAILABLE_MESSAGE, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      try {
        await prisma.message.delete({ where: { id } });
        return true;
      } catch (err) {
        console.error('[resolvers] deleteMessage mutation failed:', err);
        throw new GraphQLError(DB_UNAVAILABLE_MESSAGE, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
    },
    identifyPlantsFromLayout: async (
      _: unknown,
      {
        layoutId,
        imageUrl,
        imageData,
        autoCreatePlants = true,
        autoCreateMarkers = true,
        config,
      }: {
        layoutId: string;
        imageUrl?: string;
        imageData?: string;
        autoCreatePlants?: boolean;
        autoCreateMarkers?: boolean;
        config?: Record<string, unknown>;
      }
    ) => {
      // Validate inputs
      if (!imageUrl && !imageData) {
        throw new Error('Either imageUrl or imageData must be provided');
      }

      // Build request
      const request: PlantIdentificationRequest = {
        layoutId,
        imageUrl,
        imageData,
        autoCreatePlants,
        autoCreateMarkers,
      };

      // Merge config
      const mergedConfig = {
        ...DEFAULT_IDENTIFICATION_CONFIG,
        ...config,
      };

      // Perform identification
      const result = await identifyPlantsFromLayout(request, mergedConfig);

      // Throw error if not successful (GraphQL convention)
      if (!result.success) {
        throw new Error(result.error || 'Plant identification failed');
      }

      return result;
    },
  },
  Message: {
    author: async (message: { authorId?: string }) => {
      if (!message.authorId) return null;
      const prisma = getPrismaClient();
      if (!prisma) return null;
      try {
        return await prisma.user.findUnique({
          where: { id: message.authorId },
        });
      } catch (err) {
        console.error('[resolvers] Message.author resolver failed:', err);
        return null;
      }
    },
  },
};
