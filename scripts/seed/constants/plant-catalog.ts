/**
 * Curated list of 50 real houseplants with name + species.
 * Used by the plant builder to generate realistic plant data.
 */

export interface PlantCatalogEntry {
  name: string;
  species: string;
  location: string;
}

export const PLANT_CATALOG: PlantCatalogEntry[] = [
  { name: 'Monstera', species: 'Monstera deliciosa', location: 'Living Room' },
  { name: 'Snake Plant', species: 'Sansevieria trifasciata', location: 'Bedroom' },
  { name: 'Pothos', species: 'Epipremnum aureum', location: 'Kitchen' },
  { name: 'ZZ Plant', species: 'Zamioculcas zamiifolia', location: 'Office' },
  { name: 'Peace Lily', species: 'Spathiphyllum wallisii', location: 'Bathroom' },
  { name: 'Spider Plant', species: 'Chlorophytum comosum', location: 'Living Room' },
  { name: 'Rubber Plant', species: 'Ficus elastica', location: 'Study' },
  { name: 'Fiddle Leaf Fig', species: 'Ficus lyrata', location: 'Living Room' },
  { name: 'Aloe Vera', species: 'Aloe barbadensis miller', location: 'Kitchen' },
  { name: 'Bird of Paradise', species: 'Strelitzia reginae', location: 'Patio' },
  { name: 'Jade Plant', species: 'Crassula ovata', location: 'Windowsill' },
  { name: 'Philodendron', species: 'Philodendron hederaceum', location: 'Living Room' },
  { name: 'Chinese Evergreen', species: 'Aglaonema commutatum', location: 'Office' },
  { name: 'Dracaena', species: 'Dracaena marginata', location: 'Hallway' },
  { name: 'Boston Fern', species: 'Nephrolepis exaltata', location: 'Bathroom' },
  { name: 'Calathea', species: 'Calathea orbifolia', location: 'Bedroom' },
  { name: 'Orchid', species: 'Phalaenopsis amabilis', location: 'Windowsill' },
  { name: 'Succulent Mix', species: 'Echeveria elegans', location: 'Desk' },
  { name: 'Parlour Palm', species: 'Chamaedorea elegans', location: 'Living Room' },
  { name: 'String of Pearls', species: 'Curio rowleyanus', location: 'Shelf' },
  { name: 'Oxalis', species: 'Oxalis triangularis', location: 'Kitchen' },
  { name: 'Cactus', species: 'Ferocactus wislizeni', location: 'Windowsill' },
  { name: 'Croton', species: 'Codiaeum variegatum', location: 'Living Room' },
  { name: 'Nerve Plant', species: 'Fittonia albivenis', location: 'Terrarium' },
  { name: 'Haworthia', species: 'Haworthia fasciata', location: 'Desk' },
  { name: 'Cast Iron Plant', species: 'Aspidistra elatior', location: 'Hallway' },
  { name: 'Anthurium', species: 'Anthurium andraeanum', location: 'Bathroom' },
  { name: 'Wandering Jew', species: 'Tradescantia zebrina', location: 'Hanging Basket' },
  { name: 'African Violet', species: 'Saintpaulia ionantha', location: 'Windowsill' },
  { name: 'Begonia', species: 'Begonia × hiemalis', location: 'Balcony' },
  { name: 'Hoya', species: 'Hoya carnosa', location: 'Living Room' },
  { name: 'Pilea', species: 'Pilea peperomioides', location: 'Office' },
  { name: 'Bromeliad', species: 'Guzmania lingulata', location: 'Living Room' },
  { name: 'Air Plant', species: 'Tillandsia ionantha', location: 'Shelf' },
  { name: 'Bamboo Palm', species: 'Dypsis lutescens', location: 'Corner' },
  { name: 'English Ivy', species: 'Hedera helix', location: 'Bookshelf' },
  { name: 'Prayer Plant', species: 'Maranta leuconeura', location: 'Bedroom' },
  { name: 'Peperomia', species: 'Peperomia obtusifolia', location: 'Kitchen' },
  { name: 'Weeping Fig', species: 'Ficus benjamina', location: 'Living Room' },
  { name: 'Chrysanthemum', species: 'Chrysanthemum morifolium', location: 'Patio' },
  { name: 'Caladium', species: 'Caladium bicolor', location: 'Shaded Patio' },
  { name: 'Sago Palm', species: 'Cycas revoluta', location: 'Entryway' },
  { name: 'Lemon Tree', species: 'Citrus limon', location: 'Sunroom' },
  { name: 'Kumquat', species: 'Fortunella japonica', location: 'Balcony' },
  { name: 'Herbs Mix', species: 'Ocimum basilicum', location: 'Kitchen' },
  { name: 'Rosemary', species: 'Salvia rosmarinus', location: 'Kitchen' },
  { name: 'Lavender', species: 'Lavandula angustifolia', location: 'Balcony' },
  { name: 'Mint', species: 'Mentha spicata', location: 'Kitchen' },
  { name: 'Basil', species: 'Ocimum basilicum', location: 'Kitchen' },
  { name: 'Jasmine', species: 'Jasminum sambac', location: 'Bedroom' },
];
