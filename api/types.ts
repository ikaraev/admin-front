export interface ApiMeta {
  request_id: string;
  timestamp: string;
  page?: number;
  per_page?: number;
  total?: number;
  total_pages?: number;
}

export interface ApiSuccess<T> {
  status: 'success';
  data: T;
  meta: ApiMeta;
}

export interface ApiFailure {
  status: 'error';
  error_code: string;
  message: string;
  details: Record<string, string[]>;
  request_id: string;
  meta: { timestamp: string };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
