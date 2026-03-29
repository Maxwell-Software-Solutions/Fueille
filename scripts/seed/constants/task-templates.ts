/**
 * Realistic care task title/description combos per taskType.
 * Used by the careTask builder to generate meaningful task descriptions.
 */

import type { CareTask } from '../../../lib/domain/entities';

export interface TaskTemplate {
  title: string;
  description: string;
}

export const TASK_TEMPLATES: Record<CareTask['taskType'], TaskTemplate[]> = {
  water: [
    { title: 'Water thoroughly', description: 'Water until it drains from the bottom. Check soil moisture first.' },
    { title: 'Light watering', description: 'Mist lightly or water just the top inch. Avoid overwatering.' },
    { title: 'Deep soak', description: 'Place in a basin of water for 20 minutes to soak from below.' },
    { title: 'Check soil moisture', description: 'Stick finger 2 inches into soil. Water if dry.' },
    { title: 'Watering day', description: 'Regular scheduled watering. Use room-temperature water.' },
  ],
  fertilize: [
    { title: 'Apply liquid fertilizer', description: 'Dilute balanced fertilizer to half strength. Apply after watering.' },
    { title: 'Slow-release pellets', description: 'Add slow-release granules to soil surface. Scratch in gently.' },
    { title: 'Foliar feeding', description: 'Spray diluted fertilizer on leaves in the morning.' },
    { title: 'Boost with nitrogen', description: 'Apply nitrogen-rich fertilizer to encourage leafy growth.' },
    { title: 'Monthly feed', description: 'Scheduled monthly fertilization during growing season.' },
  ],
  prune: [
    { title: 'Remove dead leaves', description: 'Cut off yellowing or brown leaves at the base with clean scissors.' },
    { title: 'Shape pruning', description: 'Trim overgrown branches to maintain desired shape.' },
    { title: 'Deadheading', description: 'Remove spent flowers to encourage new blooms.' },
    { title: 'Root pruning', description: 'Trim roots before repotting to encourage healthy growth.' },
    { title: 'Pinch back growth tips', description: 'Pinch new growth to encourage bushier, fuller plant.' },
  ],
  repot: [
    { title: 'Repot to larger container', description: 'Move to a pot 2 inches larger. Use fresh potting mix.' },
    { title: 'Root check & refresh', description: 'Inspect roots for rot, trim as needed, refresh soil.' },
    { title: 'Divide & repot', description: 'Split root ball into 2-3 sections and pot each separately.' },
    { title: 'Top-dress soil', description: 'Remove top 2 inches of soil and replace with fresh mix.' },
    { title: 'Annual repot', description: 'Scheduled yearly repotting to refresh nutrients.' },
  ],
  other: [
    { title: 'Dust leaves', description: 'Wipe large leaves with a damp cloth to remove dust buildup.' },
    { title: 'Rotate for even light', description: 'Turn pot 90° for even sun exposure on all sides.' },
    { title: 'Check for pests', description: 'Inspect under leaves and stem joints for signs of pests.' },
    { title: 'Wipe down pot', description: 'Clean pot exterior and saucer to prevent mineral buildup.' },
    { title: 'Stake for support', description: 'Add a stake or moss pole to support climbing growth.' },
    { title: 'Misting', description: 'Mist leaves to increase humidity. Especially in dry climates.' },
    { title: 'Move to better light', description: 'Relocate plant to address leggy growth or leaf drop.' },
  ],
};
