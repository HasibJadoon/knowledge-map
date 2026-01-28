import worldviewData from '../../../../assets/mockups/worldview.json';
import {
  WorldviewEntry,
  WorldviewEntrySummary,
} from '../../../shared/models/worldview/worldview-entry.model';

const typedWorldview = worldviewData as unknown as { worldview_lesson_sample_data: WorldviewEntry };

export const worldviewKinds = ['sample'];

export const worldviewEntries = [typedWorldview.worldview_lesson_sample_data];

export type { WorldviewEntry, WorldviewEntrySummary };
