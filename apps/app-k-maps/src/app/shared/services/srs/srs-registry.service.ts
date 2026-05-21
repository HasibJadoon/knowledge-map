import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendApiService } from '../backend-api.service';

export type SrsRegistryModule = 'AR' | 'AL' | 'QR' | 'WV' | 'other';
export type SrsRegistryResourceType =
  | 'vocabulary' | 'grammar' | 'root' | 'lemma' | 'ayah' | 'concept' | 'other';

export interface SrsRegistryCard {
  id: string;
  user_ref: string;
  workspace_id: string | null;
  resource_ref: string;
  resource_type: SrsRegistryResourceType;
  module: SrsRegistryModule;
  card_ref: string | null;
  enqueued_at: string;
  last_review_at: string | null;
  next_review_at: string | null;
  total_reviews: number;
}

export interface SrsEnrollPayload {
  resourceRef: string;
  resourceType: SrsRegistryResourceType;
  module: SrsRegistryModule;
  cardRef?: string;
}

/**
 * Client for the cross-domain SRS enrollment index (gateway /api/core/srs).
 * CORE records which resources a user is learning; the card data itself
 * lives in the AR engine (see SrsService).
 */
@Injectable({ providedIn: 'root' })
export class SrsRegistryService {
  private readonly api = inject(BackendApiService);

  list(module?: SrsRegistryModule): Observable<SrsRegistryCard[]> {
    return this.api.getData<SrsRegistryCard[]>('core', ['srs', 'registry'], {
      params: module ? { module } : {},
    });
  }

  enroll(payload: SrsEnrollPayload): Observable<SrsRegistryCard> {
    return this.api.postData<SrsRegistryCard>('core', ['srs', 'registry'], payload);
  }

  remove(id: string): Observable<{ deleted: string }> {
    return this.api.deleteRaw<{ deleted: string }>(['core', 'srs', 'registry', id]);
  }
}
