import { prisma } from '@/lib/db';
import {
  identifyPlantsFromLayout,
  isPlantIdentificationAvailable,
  DEFAULT_IDENTIFICATION_CONFIG,
  type PlantIdentificationRequest,
} from '@/lib/domain';

export const resolvers = {
  Query: {
    messages: async () => {
      return await prisma.message.findMany({
        include: { author: true },
        orderBy: { createdAt: 'desc' },
      });
    },
    message: async (_: any, { id }: { id: string }) => {
      return await prisma.message.findUnique({
        where: { id },
        include: { author: true },
      });
    },
    users: async () => {
      return await prisma.user.findMany();
    },
    plantIdentificationAvailable: async () => {
      return isPlantIdentificationAvailable();
    },
  },
  Mutation: {
    createMessage: async (_: any, { text, authorId }: { text: string; authorId?: string }) => {
      return await prisma.message.create({
        data: { text, authorId },
        include: { author: true },
      });
    },
    deleteMessage: async (_: any, { id }: { id: string }) => {
      await prisma.message.delete({ where: { id } });
      return true;
    },
    identifyPlantsFromLayout: async (
      _: any,
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
        config?: any;
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
    author: async (message: any) => {
      if (!message.authorId) return null;
      return await prisma.user.findUnique({
        where: { id: message.authorId },
      });
    },
  },
};
