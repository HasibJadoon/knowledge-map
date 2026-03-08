export interface BrainstormTopic {
  id: string;
  title: string;
  createdAt: string;
  ideaCount: number;
  updatedAt: string;
  archived: boolean;
}

export interface BrainstormTopicDetail extends BrainstormTopic {
  ideas: BrainstormIdea[];
}

export interface BrainstormIdea {
  id: string;
  topicId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  highlighted: boolean;
  pinned: boolean;
  tags: string[];
  reference: string;
  context: string;
}

export interface BrainstormTopicRecord extends Omit<BrainstormTopic, 'ideaCount'> {
  archived: boolean;
}

export interface BrainstormIdeaDraft {
  topicId: string;
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
}

export interface BrainstormState {
  topics: BrainstormTopicDetail[];
}

export interface BrainstormApiIdeaDto {
  id: string;
  topicId: string;
  text: string;
  created_at: string;
  updated_at: string;
  highlighted: boolean;
  pinned: boolean;
  tags: string[];
  reference: string;
  context: string;
}

export interface BrainstormApiTopicDto {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
  ideas: BrainstormApiIdeaDto[];
}
