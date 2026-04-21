import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  BrainstormApiSubtopicDto,
  BrainstormApiTopicDto,
  BrainstormIdea,
  BrainstormIdeaDraft,
  BrainstormIdeaSearchResult,
  BrainstormState,
  BrainstormSubtopic,
  BrainstormTopic,
  BrainstormTopicDetail,
} from '../../models/worldview/brainstorm.models';
import { BrainstormApiService } from './brainstorm-api.service';

@Injectable({
  providedIn: 'root',
})
export class BrainstormStoreService {
  private readonly api = inject(BrainstormApiService);
  private readonly state = signal<BrainstormState>({ topics: [] });

  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly mutating = signal(false);
  readonly error = signal<string | null>(null);

  readonly topicCount = computed(() => this.state().topics.filter((topic) => !topic.archived).length);

  async ensureLoaded(force = false): Promise<void> {
    if (this.loading()) {
      return;
    }

    if (!force && this.loaded()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const topics = await firstValueFrom(this.api.listTopics(true));
      this.state.set({ topics: topics.map((topic) => this.toTopicDetail(topic)) });
      this.loaded.set(true);
    } catch (error: unknown) {
      this.error.set(this.toErrorMessage(error, 'Unable to load brainstorm topics.'));
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  async reload(): Promise<void> {
    await this.ensureLoaded(true);
  }

  listTopics(query = ''): BrainstormTopic[] {
    const normalizedQuery = query.trim().toLowerCase();

    return this.state().topics
      .filter((topic) => !topic.archived)
      .filter((topic) => !normalizedQuery || topic.title.toLowerCase().includes(normalizedQuery))
      .map((topic) => this.toTopic(topic))
      .sort((left, right) => this.sortByDateDesc(left.updatedAt, right.updatedAt));
  }

  getTopic(topicId: string): BrainstormTopic | null {
    const topic = this.findTopic(topicId);
    return topic ? this.toTopic(topic) : null;
  }

  getDefaultTopicId(): string | null {
    return this.listTopics()[0]?.id ?? null;
  }

  listSubtopicsForTopic(topicId: string, query = ''): BrainstormSubtopic[] {
    const topic = this.findTopic(topicId);
    if (!topic) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    return topic.subtopics
      .filter((subtopic) => !normalizedQuery || subtopic.title.toLowerCase().includes(normalizedQuery))
      .map((subtopic) => this.toSubtopic(subtopic))
      .sort((left, right) => this.sortByDateDesc(left.updatedAt, right.updatedAt));
  }

  getSubtopic(topicId: string, subtopicId: string): BrainstormSubtopic | null {
    const subtopic = this.findSubtopic(topicId, subtopicId);
    return subtopic ? this.toSubtopic(subtopic) : null;
  }

  getDefaultSubtopicId(topicId: string): string | null {
    return this.listSubtopicsForTopic(topicId)[0]?.id ?? null;
  }

  listIdeasForSubtopic(topicId: string, subtopicId: string): BrainstormIdea[] {
    const subtopic = this.findSubtopic(topicId, subtopicId);
    return subtopic ? [...subtopic.ideas].sort((left, right) => this.sortIdeas(left, right)) : [];
  }

  searchIdeas(query: string): BrainstormIdeaSearchResult[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    const results: BrainstormIdeaSearchResult[] = [];

    for (const topic of this.state().topics) {
      if (topic.archived) {
        continue;
      }

      for (const subtopic of topic.subtopics) {
        for (const idea of subtopic.ideas) {
          if (!this.matchesIdeaSearch(idea, normalizedQuery)) {
            continue;
          }

          results.push({
            idea,
            topicTitle: topic.title,
            subtopicTitle: subtopic.title,
          });
        }
      }
    }

    return results.sort((left, right) => this.sortIdeas(left.idea, right.idea));
  }

  getIdea(ideaId: string): BrainstormIdea | null {
    for (const topic of this.state().topics) {
      for (const subtopic of topic.subtopics) {
        const match = subtopic.ideas.find((idea) => idea.id === ideaId);
        if (match) {
          return match;
        }
      }
    }

    return null;
  }

  async createTopic(title: string): Promise<BrainstormTopic | null> {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return null;
    }

    return this.withMutation(async () => {
      const topic = await firstValueFrom(this.api.createTopic(trimmedTitle));
      const detail = this.toTopicDetail(topic);
      this.upsertTopics([detail]);
      return this.toTopic(detail);
    }, 'Unable to create topic.');
  }

  async renameTopic(topicId: string, title: string): Promise<BrainstormTopic | null> {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return null;
    }

    return this.withMutation(async () => {
      const topic = await firstValueFrom(this.api.updateTopic(topicId, { title: trimmedTitle }));
      const detail = this.toTopicDetail(topic);
      this.upsertTopics([detail]);
      return this.toTopic(detail);
    }, 'Unable to rename topic.');
  }

  async archiveTopic(topicId: string): Promise<void> {
    await this.withMutation(async () => {
      const topic = await firstValueFrom(this.api.updateTopic(topicId, { archived: true }));
      this.upsertTopics([this.toTopicDetail(topic)]);
    }, 'Unable to archive topic.');
  }

  async deleteTopic(topicId: string): Promise<void> {
    await this.withMutation(async () => {
      const deletedId = await firstValueFrom(this.api.deleteTopic(topicId));
      this.state.update((current) => ({
        topics: current.topics.filter((topic) => topic.id !== deletedId),
      }));
    }, 'Unable to delete topic.');
  }

  async createSubtopic(topicId: string, title: string): Promise<BrainstormSubtopic | null> {
    const trimmedTitle = title.trim();
    if (!topicId || !trimmedTitle) {
      return null;
    }

    return this.withMutation(async () => {
      const topic = await firstValueFrom(this.api.createSubtopic(topicId, trimmedTitle));
      this.upsertTopics([this.toTopicDetail(topic)]);
      return this.listSubtopicsForTopic(topicId)[0] ?? null;
    }, 'Unable to create subtopic.');
  }

  async renameSubtopic(topicId: string, subtopicId: string, title: string): Promise<BrainstormSubtopic | null> {
    const trimmedTitle = title.trim();
    if (!topicId || !subtopicId || !trimmedTitle) {
      return null;
    }

    return this.withMutation(async () => {
      const topic = await firstValueFrom(this.api.updateSubtopic(topicId, subtopicId, { title: trimmedTitle }));
      this.upsertTopics([this.toTopicDetail(topic)]);
      return this.getSubtopic(topicId, subtopicId);
    }, 'Unable to rename subtopic.');
  }

  async deleteSubtopic(topicId: string, subtopicId: string): Promise<void> {
    await this.withMutation(async () => {
      const topic = await firstValueFrom(this.api.deleteSubtopic(topicId, subtopicId));
      this.upsertTopics([this.toTopicDetail(topic)]);
    }, 'Unable to delete subtopic.');
  }

  async createIdea(draft: BrainstormIdeaDraft): Promise<BrainstormIdea | null> {
    if (!draft.topicId || !draft.subtopicId || !draft.text.trim()) {
      return null;
    }

    return this.withMutation(async () => {
      const topics = await firstValueFrom(this.api.createIdea(draft.topicId, draft.subtopicId, draft));
      this.upsertTopics(topics.map((topic) => this.toTopicDetail(topic)));
      return this.listIdeasForSubtopic(draft.topicId, draft.subtopicId)[0] ?? null;
    }, 'Unable to save idea.');
  }

  async updateIdea(ideaId: string, changes: Partial<BrainstormIdeaDraft>): Promise<BrainstormIdea | null> {
    const currentIdea = this.getIdea(ideaId);
    if (!currentIdea) {
      return null;
    }

    const sourceTopicId = currentIdea.topicId;
    const sourceSubtopicId = currentIdea.subtopicId;
    const nextTopicId = (changes.topicId ?? currentIdea.topicId).trim();
    const nextSubtopicId = (changes.subtopicId ?? currentIdea.subtopicId).trim();
    const payload: Partial<BrainstormIdeaDraft> = {
      ...changes,
      topicId: nextTopicId,
      subtopicId: nextSubtopicId,
    };

    return this.withMutation(async () => {
      const topics = await firstValueFrom(this.api.updateIdea(sourceTopicId, sourceSubtopicId, ideaId, payload));
      this.upsertTopics(topics.map((topic) => this.toTopicDetail(topic)));
      return this.getIdea(ideaId);
    }, 'Unable to update idea.');
  }

  async deleteIdea(ideaId: string): Promise<void> {
    const idea = this.getIdea(ideaId);
    if (!idea) {
      return;
    }

    await this.withMutation(async () => {
      const topics = await firstValueFrom(this.api.deleteIdea(idea.topicId, idea.subtopicId, idea.id));
      this.upsertTopics(topics.map((topic) => this.toTopicDetail(topic)));
    }, 'Unable to delete idea.');
  }

  async togglePinned(ideaId: string): Promise<BrainstormIdea | null> {
    const idea = this.getIdea(ideaId);
    return idea
      ? this.updateIdea(ideaId, {
          topicId: idea.topicId,
          subtopicId: idea.subtopicId,
          pinned: !idea.pinned,
        })
      : null;
  }

  async toggleHighlighted(ideaId: string): Promise<BrainstormIdea | null> {
    const idea = this.getIdea(ideaId);
    return idea
      ? this.updateIdea(ideaId, {
          topicId: idea.topicId,
          subtopicId: idea.subtopicId,
          highlighted: !idea.highlighted,
        })
      : null;
  }

  private findTopic(topicId: string): BrainstormTopicDetail | null {
    return this.state().topics.find((item) => item.id === topicId && !item.archived) ?? null;
  }

  private findSubtopic(topicId: string, subtopicId: string) {
    const topic = this.findTopic(topicId);
    return topic?.subtopics.find((item) => item.id === subtopicId) ?? null;
  }

  private toTopic(topic: BrainstormTopicDetail): BrainstormTopic {
    return {
      id: topic.id,
      title: topic.title,
      createdAt: topic.createdAt,
      subtopicCount: topic.subtopics.length,
      ideaCount: topic.subtopics.reduce((count, subtopic) => count + subtopic.ideas.length, 0),
      updatedAt: topic.updatedAt,
      archived: topic.archived,
    };
  }

  private toTopicDetail(topic: BrainstormApiTopicDto): BrainstormTopicDetail {
    const subtopics = (topic.subtopics ?? [])
      .map((subtopic) => this.toSubtopicDetail(subtopic))
      .sort((left, right) => this.sortByDateDesc(left.updatedAt, right.updatedAt));

    return {
      id: topic.id,
      title: topic.title,
      createdAt: topic.created_at,
      subtopicCount: subtopics.length,
      ideaCount: subtopics.reduce((count, subtopic) => count + subtopic.ideas.length, 0),
      updatedAt: topic.updated_at,
      archived: topic.archived,
      subtopics,
    };
  }

  private toSubtopic(topic: BrainstormTopicDetail['subtopics'][number]): BrainstormSubtopic {
    return {
      id: topic.id,
      topicId: topic.topicId,
      title: topic.title,
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
      ideaCount: topic.ideas.length,
    };
  }

  private toSubtopicDetail(subtopic: BrainstormApiSubtopicDto): BrainstormTopicDetail['subtopics'][number] {
    const ideas = (subtopic.ideas ?? [])
      .map((idea) => this.toIdea(idea))
      .sort((left, right) => this.sortIdeas(left, right));

    return {
      id: subtopic.id,
      topicId: subtopic.topicId,
      title: subtopic.title,
      createdAt: subtopic.created_at,
      updatedAt: subtopic.updated_at,
      ideaCount: ideas.length,
      ideas,
    };
  }

  private toIdea(idea: BrainstormApiSubtopicDto['ideas'][number]): BrainstormIdea {
    return {
      id: idea.id,
      topicId: idea.topicId,
      subtopicId: idea.subtopicId,
      text: idea.text,
      createdAt: idea.created_at,
      updatedAt: idea.updated_at,
      highlighted: idea.highlighted,
      pinned: idea.pinned,
      tags: idea.tags ?? [],
      reference: idea.reference ?? '',
      context: idea.context ?? '',
      author: idea.author
        ? {
            userId: idea.author.user_id,
            email: idea.author.email,
          }
        : null,
    };
  }

  private upsertTopics(topics: ReadonlyArray<BrainstormTopicDetail>): void {
    const topicMap = new Map(this.state().topics.map((topic) => [topic.id, topic]));
    for (const topic of topics) {
      topicMap.set(topic.id, topic);
    }

    this.state.set({ topics: Array.from(topicMap.values()) });
  }

  private matchesIdeaSearch(idea: BrainstormIdea, query: string): boolean {
    const haystack = [
      idea.text,
      idea.reference,
      idea.context,
      idea.tags.join(' '),
      idea.author?.email ?? '',
    ].join(' ').toLowerCase();

    return haystack.includes(query);
  }

  private sortIdeas(left: BrainstormIdea, right: BrainstormIdea): number {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }

    if (left.highlighted !== right.highlighted) {
      return left.highlighted ? -1 : 1;
    }

    return this.sortByDateDesc(left.updatedAt, right.updatedAt);
  }

  private sortByDateDesc(left: string, right: string): number {
    return new Date(right).getTime() - new Date(left).getTime();
  }

  private async withMutation<T>(work: () => Promise<T>, fallbackMessage: string): Promise<T> {
    this.mutating.set(true);
    this.error.set(null);

    try {
      return await work();
    } catch (error: unknown) {
      this.error.set(this.toErrorMessage(error, fallbackMessage));
      throw error;
    } finally {
      this.mutating.set(false);
    }
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return fallback;
  }
}
