/**
 * Static plant care library — curated list of common houseplants and garden plants
 * with default care schedules. This is client-safe static data (no DB access).
 */

export interface PlantCareTask {
  title: string;
  taskType: 'water' | 'fertilize' | 'prune' | 'repot' | 'other';
  repeatInterval: 'daily' | 'weekly' | 'biweekly' | 'monthly' | null;
  repeatCustomDays: number | null;
}

export interface PlantCareEntry {
  commonName: string;
  scientificName: string;
  emoji: string;
  difficulty: 'easy' | 'moderate' | 'hard';
  light: string;
  water: string;
  defaultTasks: PlantCareTask[];
}

export const PLANT_CARE_LIBRARY: PlantCareEntry[] = [
  {
    commonName: 'Pothos',
    scientificName: 'Epipremnum aureum',
    emoji: '🪴',
    difficulty: 'easy',
    light: 'Low to bright indirect',
    water: 'Every 7–10 days',
    defaultTasks: [
      { title: 'Water Pothos', taskType: 'water', repeatInterval: 'weekly', repeatCustomDays: null },
      { title: 'Fertilize Pothos', taskType: 'fertilize', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Snake Plant',
    scientificName: 'Sansevieria trifasciata',
    emoji: '🌵',
    difficulty: 'easy',
    light: 'Low to bright indirect',
    water: 'Every 2–6 weeks',
    defaultTasks: [
      { title: 'Water Snake Plant', taskType: 'water', repeatInterval: 'biweekly', repeatCustomDays: null },
      { title: 'Fertilize Snake Plant', taskType: 'fertilize', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Monstera',
    scientificName: 'Monstera deliciosa',
    emoji: '🌿',
    difficulty: 'easy',
    light: 'Bright indirect',
    water: 'Every 1–2 weeks',
    defaultTasks: [
      { title: 'Water Monstera', taskType: 'water', repeatInterval: 'weekly', repeatCustomDays: null },
      { title: 'Fertilize Monstera', taskType: 'fertilize', repeatInterval: 'monthly', repeatCustomDays: null },
      { title: 'Wipe leaves', taskType: 'other', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Peace Lily',
    scientificName: 'Spathiphyllum wallisii',
    emoji: '🌸',
    difficulty: 'easy',
    light: 'Low to moderate indirect',
    water: 'Every 7 days (keep moist)',
    defaultTasks: [
      { title: 'Water Peace Lily', taskType: 'water', repeatInterval: 'weekly', repeatCustomDays: null },
      { title: 'Fertilize Peace Lily', taskType: 'fertilize', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Spider Plant',
    scientificName: 'Chlorophytum comosum',
    emoji: '🕷️',
    difficulty: 'easy',
    light: 'Moderate to bright indirect',
    water: 'Every 7 days',
    defaultTasks: [
      { title: 'Water Spider Plant', taskType: 'water', repeatInterval: 'weekly', repeatCustomDays: null },
      { title: 'Fertilize Spider Plant', taskType: 'fertilize', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Rubber Plant',
    scientificName: 'Ficus elastica',
    emoji: '🌱',
    difficulty: 'moderate',
    light: 'Bright indirect',
    water: 'Every 1–2 weeks',
    defaultTasks: [
      { title: 'Water Rubber Plant', taskType: 'water', repeatInterval: 'weekly', repeatCustomDays: null },
      { title: 'Fertilize Rubber Plant', taskType: 'fertilize', repeatInterval: 'monthly', repeatCustomDays: null },
      { title: 'Wipe leaves', taskType: 'other', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'ZZ Plant',
    scientificName: 'Zamioculcas zamiifolia',
    emoji: '🪨',
    difficulty: 'easy',
    light: 'Low to moderate indirect',
    water: 'Every 2–3 weeks',
    defaultTasks: [
      { title: 'Water ZZ Plant', taskType: 'water', repeatInterval: 'biweekly', repeatCustomDays: null },
      { title: 'Fertilize ZZ Plant', taskType: 'fertilize', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Fiddle Leaf Fig',
    scientificName: 'Ficus lyrata',
    emoji: '🌳',
    difficulty: 'hard',
    light: 'Bright indirect',
    water: 'Every 7–10 days',
    defaultTasks: [
      { title: 'Water Fiddle Leaf Fig', taskType: 'water', repeatInterval: 'weekly', repeatCustomDays: null },
      { title: 'Fertilize Fiddle Leaf Fig', taskType: 'fertilize', repeatInterval: 'monthly', repeatCustomDays: null },
      { title: 'Wipe leaves', taskType: 'other', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Aloe Vera',
    scientificName: 'Aloe barbadensis miller',
    emoji: '🌵',
    difficulty: 'easy',
    light: 'Bright direct to indirect',
    water: 'Every 2–3 weeks',
    defaultTasks: [
      { title: 'Water Aloe Vera', taskType: 'water', repeatInterval: 'biweekly', repeatCustomDays: null },
      { title: 'Fertilize Aloe Vera', taskType: 'fertilize', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Jade Plant',
    scientificName: 'Crassula ovata',
    emoji: '💎',
    difficulty: 'easy',
    light: 'Bright direct to indirect',
    water: 'Every 2–3 weeks',
    defaultTasks: [
      { title: 'Water Jade Plant', taskType: 'water', repeatInterval: 'biweekly', repeatCustomDays: null },
      { title: 'Fertilize Jade Plant', taskType: 'fertilize', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Philodendron',
    scientificName: 'Philodendron hederaceum',
    emoji: '💚',
    difficulty: 'easy',
    light: 'Moderate to bright indirect',
    water: 'Every 7–10 days',
    defaultTasks: [
      { title: 'Water Philodendron', taskType: 'water', repeatInterval: 'weekly', repeatCustomDays: null },
      { title: 'Fertilize Philodendron', taskType: 'fertilize', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Chinese Evergreen',
    scientificName: 'Aglaonema commutatum',
    emoji: '🌿',
    difficulty: 'easy',
    light: 'Low to moderate indirect',
    water: 'Every 7–10 days',
    defaultTasks: [
      { title: 'Water Chinese Evergreen', taskType: 'water', repeatInterval: 'weekly', repeatCustomDays: null },
      { title: 'Fertilize Chinese Evergreen', taskType: 'fertilize', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Orchid',
    scientificName: 'Phalaenopsis amabilis',
    emoji: '🌺',
    difficulty: 'moderate',
    light: 'Bright indirect',
    water: 'Every 7 days (ice cube method)',
    defaultTasks: [
      { title: 'Water Orchid', taskType: 'water', repeatInterval: 'weekly', repeatCustomDays: null },
      { title: 'Fertilize Orchid', taskType: 'fertilize', repeatInterval: 'biweekly', repeatCustomDays: null },
      { title: 'Prune spent blooms', taskType: 'prune', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'English Ivy',
    scientificName: 'Hedera helix',
    emoji: '🍃',
    difficulty: 'moderate',
    light: 'Moderate to bright indirect',
    water: 'Every 7 days',
    defaultTasks: [
      { title: 'Water English Ivy', taskType: 'water', repeatInterval: 'weekly', repeatCustomDays: null },
      { title: 'Fertilize English Ivy', taskType: 'fertilize', repeatInterval: 'monthly', repeatCustomDays: null },
      { title: 'Trim vines', taskType: 'prune', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Boston Fern',
    scientificName: 'Nephrolepis exaltata',
    emoji: '🌿',
    difficulty: 'moderate',
    light: 'Moderate indirect',
    water: 'Every 3–5 days (keep moist)',
    defaultTasks: [
      { title: 'Water Boston Fern', taskType: 'water', repeatInterval: null, repeatCustomDays: 4 },
      { title: 'Fertilize Boston Fern', taskType: 'fertilize', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Lavender',
    scientificName: 'Lavandula angustifolia',
    emoji: '💜',
    difficulty: 'moderate',
    light: 'Full sun (6+ hours)',
    water: 'Every 10–14 days (drought tolerant)',
    defaultTasks: [
      { title: 'Water Lavender', taskType: 'water', repeatInterval: null, repeatCustomDays: 12 },
      { title: 'Fertilize Lavender', taskType: 'fertilize', repeatInterval: 'monthly', repeatCustomDays: null },
      { title: 'Prune Lavender', taskType: 'prune', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Basil',
    scientificName: 'Ocimum basilicum',
    emoji: '🌿',
    difficulty: 'moderate',
    light: 'Full sun (6+ hours)',
    water: 'Every 2–3 days',
    defaultTasks: [
      { title: 'Water Basil', taskType: 'water', repeatInterval: null, repeatCustomDays: 2 },
      { title: 'Pinch flowers', taskType: 'prune', repeatInterval: 'weekly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Rosemary',
    scientificName: 'Salvia rosmarinus',
    emoji: '🌱',
    difficulty: 'easy',
    light: 'Full sun',
    water: 'Every 7–10 days',
    defaultTasks: [
      { title: 'Water Rosemary', taskType: 'water', repeatInterval: 'weekly', repeatCustomDays: null },
      { title: 'Trim Rosemary', taskType: 'prune', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Mint',
    scientificName: 'Mentha spicata',
    emoji: '🌱',
    difficulty: 'easy',
    light: 'Moderate to full sun',
    water: 'Every 2–3 days (keep moist)',
    defaultTasks: [
      { title: 'Water Mint', taskType: 'water', repeatInterval: null, repeatCustomDays: 2 },
      { title: 'Trim Mint', taskType: 'prune', repeatInterval: 'biweekly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Succulent',
    scientificName: 'Echeveria elegans',
    emoji: '🌵',
    difficulty: 'easy',
    light: 'Bright direct to indirect',
    water: 'Every 2–4 weeks',
    defaultTasks: [
      { title: 'Water Succulent', taskType: 'water', repeatInterval: null, repeatCustomDays: 21 },
      { title: 'Fertilize Succulent', taskType: 'fertilize', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Tomato',
    scientificName: 'Solanum lycopersicum',
    emoji: '🍅',
    difficulty: 'moderate',
    light: 'Full sun (8+ hours)',
    water: 'Every 2–3 days (keep consistent)',
    defaultTasks: [
      { title: 'Water Tomato', taskType: 'water', repeatInterval: null, repeatCustomDays: 2 },
      { title: 'Fertilize Tomato', taskType: 'fertilize', repeatInterval: 'biweekly', repeatCustomDays: null },
      { title: 'Prune suckers', taskType: 'prune', repeatInterval: 'weekly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Rose',
    scientificName: 'Rosa',
    emoji: '🌹',
    difficulty: 'moderate',
    light: 'Full sun (6+ hours)',
    water: 'Every 7 days',
    defaultTasks: [
      { title: 'Water Rose', taskType: 'water', repeatInterval: 'weekly', repeatCustomDays: null },
      { title: 'Fertilize Rose', taskType: 'fertilize', repeatInterval: 'biweekly', repeatCustomDays: null },
      { title: 'Deadhead Rose', taskType: 'prune', repeatInterval: 'weekly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Calathea',
    scientificName: 'Calathea orbifolia',
    emoji: '🎨',
    difficulty: 'hard',
    light: 'Low to moderate indirect',
    water: 'Every 7 days (filtered water preferred)',
    defaultTasks: [
      { title: 'Water Calathea', taskType: 'water', repeatInterval: 'weekly', repeatCustomDays: null },
      { title: 'Fertilize Calathea', taskType: 'fertilize', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Pilea',
    scientificName: 'Pilea peperomioides',
    emoji: '🟢',
    difficulty: 'easy',
    light: 'Bright indirect',
    water: 'Every 7–10 days',
    defaultTasks: [
      { title: 'Water Pilea', taskType: 'water', repeatInterval: 'weekly', repeatCustomDays: null },
      { title: 'Fertilize Pilea', taskType: 'fertilize', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Anthurium',
    scientificName: 'Anthurium andraeanum',
    emoji: '❤️',
    difficulty: 'moderate',
    light: 'Bright indirect',
    water: 'Every 7 days',
    defaultTasks: [
      { title: 'Water Anthurium', taskType: 'water', repeatInterval: 'weekly', repeatCustomDays: null },
      { title: 'Fertilize Anthurium', taskType: 'fertilize', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Dracaena',
    scientificName: 'Dracaena marginata',
    emoji: '🌴',
    difficulty: 'easy',
    light: 'Low to bright indirect',
    water: 'Every 2 weeks',
    defaultTasks: [
      { title: 'Water Dracaena', taskType: 'water', repeatInterval: 'biweekly', repeatCustomDays: null },
      { title: 'Fertilize Dracaena', taskType: 'fertilize', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Prayer Plant',
    scientificName: 'Maranta leuconeura',
    emoji: '🙏',
    difficulty: 'moderate',
    light: 'Low to moderate indirect',
    water: 'Every 7 days (keep moist)',
    defaultTasks: [
      { title: 'Water Prayer Plant', taskType: 'water', repeatInterval: 'weekly', repeatCustomDays: null },
      { title: 'Fertilize Prayer Plant', taskType: 'fertilize', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Hoya',
    scientificName: 'Hoya carnosa',
    emoji: '🌺',
    difficulty: 'easy',
    light: 'Moderate to bright indirect',
    water: 'Every 7–14 days',
    defaultTasks: [
      { title: 'Water Hoya', taskType: 'water', repeatInterval: 'weekly', repeatCustomDays: null },
      { title: 'Fertilize Hoya', taskType: 'fertilize', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'Bird of Paradise',
    scientificName: 'Strelitzia reginae',
    emoji: '🦜',
    difficulty: 'moderate',
    light: 'Bright direct to indirect',
    water: 'Every 7–14 days',
    defaultTasks: [
      { title: 'Water Bird of Paradise', taskType: 'water', repeatInterval: 'weekly', repeatCustomDays: null },
      { title: 'Fertilize Bird of Paradise', taskType: 'fertilize', repeatInterval: 'monthly', repeatCustomDays: null },
      { title: 'Wipe leaves', taskType: 'other', repeatInterval: 'monthly', repeatCustomDays: null },
    ],
  },
  {
    commonName: 'African Violet',
    scientificName: 'Saintpaulia ionantha',
    emoji: '💜',
    difficulty: 'moderate',
    light: 'Bright indirect',
    water: 'Every 7 days (water from below)',
    defaultTasks: [
      { title: 'Water African Violet', taskType: 'water', repeatInterval: 'weekly', repeatCustomDays: null },
      { title: 'Fertilize African Violet', taskType: 'fertilize', repeatInterval: 'biweekly', repeatCustomDays: null },
      { title: 'Remove dead blooms', taskType: 'prune', repeatInterval: 'weekly', repeatCustomDays: null },
    ],
  },
];
