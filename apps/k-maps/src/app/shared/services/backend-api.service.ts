import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export type BackendModule = 'qr' | 'wv' | 'ar' | 'al' | 'cm' | 'pl' | 'core';
export type BackendPathSegment = string | number;

export interface BackendApiResponse<T> {
  ok: boolean;
  data: T;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export interface BackendRequestOptions {
  headers?: HttpHeaders | Record<string, string | string[]>;
  context?: HttpContext;
  params?: HttpParams | Record<string, string | number | boolean | readonly (string | number | boolean)[]>;
  withCredentials?: boolean;
}

@Injectable({ providedIn: 'root' })
export class BackendApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBase.replace(/\/+$/, '');

  moduleUrl(module: BackendModule, ...segments: BackendPathSegment[]): string {
    return this.url(module, ...segments);
  }

  url(...segments: BackendPathSegment[]): string {
    const path = segments
      .filter((segment) => segment !== '')
      .map((segment) => encodeURIComponent(String(segment)))
      .join('/');
    return path ? `${this.baseUrl}/${path}` : this.baseUrl;
  }

  getResponse<T>(
    module: BackendModule,
    segments: BackendPathSegment[] = [],
    options?: BackendRequestOptions,
  ): Observable<BackendApiResponse<T>> {
    return this.http.get<BackendApiResponse<T>>(
      this.moduleUrl(module, ...segments),
      options,
    );
  }

  getRaw<T>(
    segments: BackendPathSegment[],
    options?: BackendRequestOptions,
  ): Observable<T> {
    return this.http.get<T>(this.url(...segments), options);
  }

  getData<T>(
    module: BackendModule,
    segments: BackendPathSegment[] = [],
    options?: BackendRequestOptions,
  ): Observable<T> {
    return this.getResponse<T>(module, segments, options).pipe(
      map((response) => this.unwrap(response)),
    );
  }

  postRaw<T>(
    segments: BackendPathSegment[],
    body: unknown,
    options?: BackendRequestOptions,
  ): Observable<T> {
    return this.http.post<T>(this.url(...segments), body, options);
  }

  postData<T>(
    module: BackendModule,
    segments: BackendPathSegment[],
    body: unknown,
    options?: BackendRequestOptions,
  ): Observable<T> {
    return this.http
      .post<BackendApiResponse<T>>(this.moduleUrl(module, ...segments), body, options)
      .pipe(map((response) => this.unwrap(response)));
  }

  putRaw<T>(
    segments: BackendPathSegment[],
    body: unknown,
    options?: BackendRequestOptions,
  ): Observable<T> {
    return this.http.put<T>(this.url(...segments), body, options);
  }

  putData<T>(
    module: BackendModule,
    segments: BackendPathSegment[],
    body: unknown,
    options?: BackendRequestOptions,
  ): Observable<T> {
    return this.http
      .put<BackendApiResponse<T>>(this.moduleUrl(module, ...segments), body, options)
      .pipe(map((response) => this.unwrap(response)));
  }

  private unwrap<T>(response: BackendApiResponse<T>): T {
    if (response.ok && response.data !== undefined) return response.data;
    throw new Error(response.error?.message ?? 'Backend request failed');
  }
}
