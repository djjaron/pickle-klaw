import { handler } from '@/netlify/functions/webhook';

export const dynamic = 'force-dynamic';

async function forward(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const queryStringParameters: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    queryStringParameters[key] = value;
  });

  const response = await handler({
    httpMethod: request.method,
    body: await request.text(),
    queryStringParameters,
  });

  return new Response(response.body, {
    status: response.statusCode,
    headers: response.headers,
  });
}

export async function POST(request: Request) {
  return forward(request);
}

export async function GET(request: Request) {
  return forward(request);
}
