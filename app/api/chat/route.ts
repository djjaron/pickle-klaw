import { handler } from '@/netlify/functions/chat';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const response = await handler({
    httpMethod: 'POST',
    body: await request.text(),
    queryStringParameters: null,
  });

  return new Response(response.body, {
    status: response.statusCode,
    headers: response.headers,
  });
}
