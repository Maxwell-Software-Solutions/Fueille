export const typeDefs = `#graphql
  type User {
    id: ID!
    email: String!
    name: String
    messages: [Message!]!
  }

  type Message {
    id: ID!
    text: String!
    createdAt: String!
    author: User
    authorId: String
  }

  type IdentifiedPlant {
    name: String!
    species: String
    commonName: String
    scientificName: String
    description: String!
    careInstructions: String!
    confidence: Float!
    positionX: Float
    positionY: Float
    source: String!
  }

  type PlantIdentificationResult {
    success: Boolean!
    plants: [IdentifiedPlant!]!
    layoutId: ID!
    createdPlantIds: [ID!]
    createdMarkerIds: [ID!]
    processingTimeMs: Int!
    error: String
  }

  input PlantIdentificationConfigInput {
    model: String
    maxImageSize: Int
    compressionQuality: Float
    enablePlantIdFallback: Boolean
  }

  type Query {
    messages: [Message!]!
    message(id: ID!): Message
    users: [User!]!
    plantIdentificationAvailable: PlantIdentificationAvailability!
  }

  type PlantIdentificationAvailability {
    available: Boolean!
    providers: [String!]!
    message: String
  }

  type Mutation {
    createMessage(text: String!, authorId: ID): Message!
    deleteMessage(id: ID!): Boolean!
    identifyPlantsFromLayout(
      layoutId: ID!
      imageUrl: String
      imageData: String
      autoCreatePlants: Boolean
      autoCreateMarkers: Boolean
      config: PlantIdentificationConfigInput
    ): PlantIdentificationResult!
  }
`;
