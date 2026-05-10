export interface FunctionEvent {
  httpMethod: string;
  body: string | null;
  queryStringParameters?: Record<string, string | undefined> | null;
}

export interface FunctionResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

export type Handler = (event: FunctionEvent) => Promise<FunctionResponse> | FunctionResponse;

export function json(statusCode: number, body: unknown): FunctionResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}
