export interface BrainstormTopic {
  id: string;
  title: string;
  createdAt: string;
  subtopicCount: number;
  ideaCount: number;
  updatedAt: string;
  archived: boolean;
}

export interface BrainstormTopicDetail extends BrainstormTopic {
  subtopics: BrainstormSubtopicDetail[];
}

export interface BrainstormSubtopic {
  id: string;
  topicId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  ideaCount: number;
}

export interface BrainstormSubtopicDetail extends BrainstormSubtopic {
  ideas: BrainstormIdea[];
}

export interface BrainstormIdeaAuthor {
  userId: number;
  email: string;
}

export interface BrainstormIdea {
  id: string;
  topicId: string;
  subtopicId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  highlighted: boolean;
  pinned: boolean;
  tags: string[];
  reference: string;
  context: string;
  author: BrainstormIdeaAuthor | null;
}

export interface BrainstormTopicRecord extends Omit<BrainstormTopic, 'subtopicCount' | 'ideaCount'> {
  archived: boolean;
}

export interface BrainstormSubtopicDraft {
  topicId: string;
  title: string;
}

export interface BrainstormIdeaDraft {
  topicId: string;
  subtopicId: string;
  text: string;
  highlighted?: boolean;
  pinned?: boolean;
  tags?: string[];
  reference?: string;
  context?: string;
}

export interface BrainstormIdeaSearchResult {
  idea: BrainstormIdea;
  topicTitle: string;
  subtopicTitle: string;
}

export interface BrainstormState {
  topics: BrainstormTopicDetail[];
}

export interface BrainstormApiIdeaAuthorDto {
  user_id: number;
  email: string;
}

export interface BrainstormApiIdeaDto {
  id: string;
  topicId: string;
  subtopicId: string;
  text: string;
  created_at: string;
  updated_at: string;
  highlighted: boolean;
  pinned: boolean;
  tags: string[];
  reference: string;
  context: string;
  author: BrainstormApiIdeaAuthorDto | null;
}

export interface BrainstormApiSubtopicDto {
  id: string;
  topicId: string;
  title: string;
  created_at: string;
  updated_at: string;
  ideas: BrainstormApiIdeaDto[];
}

export interface BrainstormApiTopicDto {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
  subtopics: BrainstormApiSubtopicDto[];
}
