import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PodcastService } from '../../sprint/services/podcast.service';
import {
  CreatorEpisode,
  CreatorEpisodeStatus,
  CreatorEpisodeType,
  cloneEpisode,
  createBlankEpisode,
  episodeTypeLabel,
  mapPodcastEpisodeToCreator,
  toPodcastSavePayload,
} from './podcast-builder.models';

@Injectable({ providedIn: 'root' })
export class PodcastBuilderService {
  private readonly podcastService = inject(PodcastService);
  private seeded = false;

  async listEpisodes(query = '', status: CreatorEpisodeStatus | 'all' = 'all'): Promise<CreatorEpisode[]> {
    let rows = await firstValueFrom(this.podcastService.list(query, 80));
    let items = rows.map((row) => mapPodcastEpisodeToCreator(row));

    if (!query.trim() && items.length === 0 && !this.seeded) {
      await this.seedExamples();
      rows = await firstValueFrom(this.podcastService.list('', 80));
      items = rows.map((row) => mapPodcastEpisodeToCreator(row));
      this.seeded = true;
    }

    return status === 'all'
      ? items
      : items.filter((item) => item.status === status);
  }

  async getEpisode(id: string): Promise<CreatorEpisode> {
    const row = await firstValueFrom(this.podcastService.get(id));
    return mapPodcastEpisodeToCreator(row);
  }

  async createEpisode(title: string, type: CreatorEpisodeType): Promise<CreatorEpisode> {
    const normalized = title.trim();
    if (!normalized) {
      throw new Error('Episode title is required.');
    }

    const episode = createBlankEpisode({
      id: '',
      title: normalized,
      type,
    });

    const row = await firstValueFrom(this.podcastService.create(toPodcastSavePayload(episode)));
    return mapPodcastEpisodeToCreator(row);
  }

  async saveEpisode(episode: CreatorEpisode): Promise<CreatorEpisode> {
    const payload = toPodcastSavePayload(episode);
    const row = await firstValueFrom(this.podcastService.save(episode.id, payload));
    return mapPodcastEpisodeToCreator(row);
  }

  updateEpisode(episode: CreatorEpisode, mutate: (draft: CreatorEpisode) => void): CreatorEpisode {
    const draft = cloneEpisode(episode);
    mutate(draft);
    draft.estimatedDuration = draft.segments.reduce((sum, segment) => sum + (segment.duration ?? 0), 0) || null;
    return draft;
  }

  private async seedExamples(): Promise<void> {
    const examples = buildSeedEpisodes();
    for (const episode of examples) {
      await firstValueFrom(this.podcastService.create(toPodcastSavePayload(episode)));
    }
  }
}

function buildSeedEpisodes(): CreatorEpisode[] {
  const now = new Date().toISOString();

  const solo = createBlankEpisode({
    id: '',
    title: 'Surah Al-Isra: Corruption and Civilizational Collapse',
    type: 'solo',
    createdAt: now,
    updatedAt: now,
    status: 'draft',
  });
  solo.segments = [
    {
      ...solo.segments[0],
      title: 'Intro',
      type: 'Intro',
      duration: 2,
      summary: 'Frame the central tension of civilizational decline.',
      talkingPoints: [
        { id: 'sp1', text: 'Open with the idea of civilizational cycles', tone: 'hook', order: 0 },
        { id: 'sp2', text: 'Mention the Qur’anic framing of corruption', tone: 'core', order: 1 },
      ],
    },
    {
      ...solo.segments[1],
      id: 'solo-passage',
      title: 'Passage: 17:4–8',
      type: 'Passage',
      duration: 5,
      summary: 'Read and frame the passage.',
      reference: '17:4–8',
      talkingPoints: [
        { id: 'sp3', text: 'Read the passage and mark the double corruption theme', tone: 'core', order: 0 },
        { id: 'sp4', text: 'Explain the structure of warning and return', tone: 'transition', order: 1 },
      ],
    },
    {
      ...solo.segments[2],
      id: 'solo-analysis',
      title: 'Analysis',
      type: 'Analysis',
      duration: 6,
      summary: 'Draw out the rise and fall logic.',
      talkingPoints: [
        { id: 'sp5', text: 'Civilizations rise through justice', tone: 'core', order: 0 },
        { id: 'sp6', text: 'Arrogance leads to corruption', tone: 'core', order: 1 },
        { id: 'sp7', text: 'Quran predicts cycles of collapse', tone: 'core', order: 2 },
        { id: 'sp8', text: 'Compare with Tower of Babel', tone: 'closing', order: 3 },
      ],
    },
    {
      ...solo.segments[3],
      id: 'solo-reflection',
      title: 'Reflection',
      type: 'Reflection',
      duration: 4,
      summary: 'Connect the pattern to modern state power.',
      talkingPoints: [
        { id: 'sp9', text: 'Ask what moral collapse looks like today', tone: 'transition', order: 0 },
        { id: 'sp10', text: 'Return to accountability and justice', tone: 'closing', order: 1 },
      ],
    },
    {
      ...solo.segments[0],
      id: 'solo-conclusion',
      title: 'Conclusion',
      type: 'Conclusion',
      duration: 2,
      summary: 'Close with takeaway and CTA.',
      talkingPoints: [
        { id: 'sp11', text: 'Summarize the rise and fall pattern', tone: 'closing', order: 0 },
        { id: 'sp12', text: 'Invite viewers to continue to the next passage', tone: 'closing', order: 1 },
      ],
    },
  ];
  solo.publish.videoTitle = solo.title;
  solo.publish.tags = 'isra, quran tafsir, civilization collapse, tower of babel';
  solo.publish.thumbnailNote = 'City ruins + Qur’anic framing';

  const discussion = createBlankEpisode({
    id: '',
    title: 'Genesis vs Qur’an Discussion',
    type: 'discussion',
    createdAt: now,
    updatedAt: now,
    status: 'script',
  });
  discussion.segments = [
    {
      ...discussion.segments[0],
      title: 'Intro',
      type: 'Intro',
      duration: 2,
      summary: 'Open the contrast between the texts.',
      dialogueItems: [
        { id: 'd1', speaker: 'host', text: 'Open with the contrast', cue: '', order: 0 },
        { id: 'd2', speaker: 'co_host', text: 'Explain Genesis framing', cue: '', order: 1 },
      ],
    },
    {
      ...discussion.segments[1],
      id: 'discussion-compare',
      title: 'Text comparison',
      type: 'Comparison',
      duration: 5,
      summary: 'Lay out the textual framing side by side.',
      dialogueItems: [
        { id: 'd3', speaker: 'host', text: 'Ask whether unity is moral or political', cue: '', order: 0 },
        { id: 'd4', speaker: 'co_host', text: 'Compare with Qur’anic framing', cue: '', order: 1 },
      ],
    },
    {
      ...discussion.segments[2],
      id: 'discussion-analysis',
      title: 'Analysis',
      type: 'Analysis',
      duration: 6,
      summary: 'Connect the framing to civilizational order.',
      dialogueItems: [
        { id: 'd5', speaker: 'host', text: 'Push on how power and hubris interact', cue: '', order: 0 },
        { id: 'd6', speaker: 'co_host', text: 'Tie it to prophetic warning', cue: '', order: 1 },
      ],
    },
    {
      ...discussion.segments[3],
      id: 'discussion-conclusion',
      title: 'Conclusion',
      type: 'Conclusion',
      duration: 2,
      summary: 'Land the contrast and next step.',
      dialogueItems: [
        { id: 'd7', speaker: 'both', text: 'Close with the main takeaway', cue: 'Keep it concise', order: 0 },
      ],
    },
  ];
  discussion.publish.videoTitle = discussion.title;

  const lessonLog = createBlankEpisode({
    id: '',
    title: 'Surah Al-Isra Lesson 3',
    type: 'lesson_log',
    createdAt: now,
    updatedAt: now,
    status: 'completed',
  });
  lessonLog.segments = [
    {
      ...lessonLog.segments[0],
      title: 'Passage Reading',
      type: 'Reading',
      duration: 12,
      summary: 'Covered verses 17:4–8.',
      lessonState: 'done',
      doneItems: [
        { id: 'l1', text: 'Read verses 17:4–8', order: 0 },
        { id: 'l2', text: 'Explained corruption twice', order: 1 },
      ],
      reviewItems: [],
    },
    {
      ...lessonLog.segments[1],
      id: 'lesson-vocab',
      title: 'Vocabulary',
      type: 'Vocabulary',
      duration: 10,
      summary: 'Key wording and sequence.',
      lessonState: 'needs_review',
      doneItems: [
        { id: 'l3', text: 'Covered key Arabic wording', order: 0 },
      ],
      reviewItems: [
        { id: 'l4', text: 'Revisit key wording', order: 0 },
        { id: 'l5', text: 'Clarify sequence', order: 1 },
      ],
    },
    {
      ...lessonLog.segments[2],
      id: 'lesson-discussion',
      title: 'Discussion',
      type: 'Discussion',
      duration: 15,
      summary: 'Historical cycles and comparison.',
      lessonState: 'done',
      doneItems: [
        { id: 'l6', text: 'Discussed historical cycles', order: 0 },
      ],
      reviewItems: [
        { id: 'l7', text: 'Prepare handout', order: 0 },
      ],
    },
    {
      ...lessonLog.segments[3],
      id: 'lesson-homework',
      title: 'Homework',
      type: 'Homework',
      duration: 5,
      summary: 'Assigned next reading.',
      lessonState: 'assigned',
      doneItems: [
        { id: 'l8', text: 'Assign reading for next session', order: 0 },
      ],
      reviewItems: [],
    },
  ];
  lessonLog.output.lessonSummary = 'Covered verses 17:4–8 and discussed corruption cycles';
  lessonLog.output.reviewChecklist = 'historical order\nvocabulary recap\ndiscussion prompts';
  lessonLog.output.nextSessionPrep = 'prepare handout\nrevisit comparison\nassign reading';

  return [solo, discussion, lessonLog].map((episode) => {
    episode.estimatedDuration = episode.segments.reduce((sum, segment) => sum + (segment.duration ?? 0), 0);
    episode.publish.estimatedDuration = episode.estimatedDuration ? `${episode.estimatedDuration} min` : '';
    episode.rawContent = {
      builder_seed: true,
      seed_label: `${episodeTypeLabel(episode.type)} example`,
    };
    return episode;
  });
}
