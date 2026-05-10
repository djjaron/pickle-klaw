import { handler } from '@/netlify/functions/dashboard-stats';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = await handler({
    httpMethod: 'GET',
    body: null,
    queryStringParameters: Object.fromEntries(url.searchParams.entries()),
  });

  return new Response(response.body, {
    status: response.statusCode,
    headers: response.headers,
  });
}
