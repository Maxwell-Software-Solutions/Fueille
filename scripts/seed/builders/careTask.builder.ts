
import type { Faker } from '@faker-js/faker';
import type { CareTask } from '../../../lib/domain/entities';
import { TASK_TEMPLATES } from '../constants/task-templates';

const TASK_TYPES: CareTask['taskType'][] = ['water', 'fertilize', 'prune', 'repot', 'other'];
const REPEAT_INTERVALS: CareTask['repeatInterval'][] = ['daily', 'weekly', 'biweekly', 'monthly', null];

/**
 * Due-date distribution:
 *   20% overdue (1–14 days ago)
 *   60% upcoming (today → +7 days)
 *   20% future  (+7 → +30 days)
 *
 * Completed tasks (~30% of non-overdue): have completedAt set.
 */
function buildDueAt(faker: Faker): { dueAt: Date; completedAt: Date | null } {
  const roll = faker.number.float({ min: 0, max: 1 });
  const now = new Date();

  if (roll < 0.2) {
    // Overdue
    const dueAt = faker.date.recent({ days: 14 });
    return { dueAt, completedAt: null };
  } else if (roll < 0.8) {
    // Upcoming (within 7 days)
    const dueAt = faker.date.soon({ days: 7 });
    const completed = faker.datatype.boolean({ probability: 0.3 });
    const completedAt = completed
      ? faker.date.between({ from: new Date(now.getTime() - 86400000 * 2), to: now })
      : null;
    return { dueAt, completedAt };
  } else {
    // Future (7–30 days out)
    const dueAt = faker.date.soon({ days: 30, refDate: new Date(Date.now() + 7 * 86400000) });
    return { dueAt, completedAt: null };
  }
}

export function buildCareTask(plantId: string, faker: Faker): CareTask {
  const taskType = faker.helpers.arrayElement(TASK_TYPES);
  const templates = TASK_TEMPLATES[taskType];
  const template = faker.helpers.arrayElement(templates);
  const { dueAt, completedAt } = buildDueAt(faker);
  const repeatInterval = faker.helpers.maybe(
    () => faker.helpers.arrayElement(REPEAT_INTERVALS.filter(Boolean) as NonNullable<CareTask['repeatInterval']>[]),
    { probability: 0.4 },
  ) ?? null;
  const createdAt = faker.date.past({ years: 0.5 });

  return {
    id: faker.string.uuid(),
    plantId,
    title: template.title,
    description: template.description,
    taskType,
    dueAt,
    completedAt,
    snoozedUntil: null,
    repeatInterval,
    repeatCustomDays: null,
    createdAt,
    updatedAt: faker.date.between({ from: createdAt, to: new Date() }),
    deletedAt: null,
  };
}

/** Generate 2–5 care tasks per plant */
export function buildCareTasksForPlant(plantId: string, faker: Faker): CareTask[] {
  const count = faker.number.int({ min: 2, max: 5 });
  return Array.from({ length: count }, () => buildCareTask(plantId, faker));
}
