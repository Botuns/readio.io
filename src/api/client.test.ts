import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { apiPaths } from '@/lib/routes';
import { server } from '@/mocks/server';
import { apiGet } from './client';
import { campaignJobsResponseSchema, roomResponseSchema } from './schemas';

const SAMPLE_ROOM = 'campaign_119interview~~stephtester1@readie.io~~a3953942a9f2';
const SPACED_ROOM = 'campaign_119interview~~kofi.mensah 12@example.com';

describe('apiGet', () => {
  it('sends all three required headers on every call', async () => {
    const seen: Headers[] = [];
    server.use(
      http.get('*/campaignHACKATHON/:id', ({ request }) => {
        seen.push(request.headers);
        return HttpResponse.json([]);
      }),
      http.get('*/roomsHACKATHON/:roomName', ({ request }) => {
        seen.push(request.headers);
        return HttpResponse.json([]);
      }),
    );

    await apiGet({ path: apiPaths.campaignJobs('119'), schema: campaignJobsResponseSchema });
    await apiGet({ path: apiPaths.room(SAMPLE_ROOM), schema: roomResponseSchema });

    expect(seen).toHaveLength(2);
    for (const headers of seen) {
      expect(headers.get('Content-Type')).toBe('application/json');
      expect(headers.get('MyAuthorizationx')).toBe('test-custom-auth');
      expect(headers.get('Authorization')).toBe('Basic dGVzdDp0ZXN0');
    }
  });

  it.each([SAMPLE_ROOM, SPACED_ROOM])('requests %s encoded exactly once', async (roomName) => {
    let requested = '';
    server.use(
      http.get('*/roomsHACKATHON/:roomName', ({ request }) => {
        requested = request.url;
        return HttpResponse.json([]);
      }),
    );

    await apiGet({ path: apiPaths.room(roomName), schema: roomResponseSchema });

    expect(requested).not.toContain('%25');
    expect(requested).not.toContain(' ');
    expect(decodeURIComponent(requested.split('/roomsHACKATHON/')[1] ?? '')).toBe(roomName);
  });

  it('returns validated data on success', async () => {
    const result = await apiGet({
      path: apiPaths.campaignJobs('119'),
      schema: campaignJobsResponseSchema,
    });
    expect(result.ok && result.data.length).toBe(4);
  });

  it.each([401, 403])('maps %i to unauthorized', async (status) => {
    server.use(http.get('*/campaignHACKATHON/:id', () => HttpResponse.json({}, { status })));
    const result = await apiGet({
      path: apiPaths.campaignJobs('119'),
      schema: campaignJobsResponseSchema,
    });
    expect(result).toMatchObject({ ok: false, error: { kind: 'unauthorized', status } });
  });

  it('maps 404 to not_found and 500 to http', async () => {
    server.use(http.get('*/campaignHACKATHON/404', () => HttpResponse.json({}, { status: 404 })));
    server.use(http.get('*/campaignHACKATHON/500', () => HttpResponse.json({}, { status: 500 })));
    const notFound = await apiGet({
      path: apiPaths.campaignJobs('404'),
      schema: campaignJobsResponseSchema,
    });
    const failed = await apiGet({
      path: apiPaths.campaignJobs('500'),
      schema: campaignJobsResponseSchema,
    });
    expect(notFound).toMatchObject({ ok: false, error: { kind: 'not_found' } });
    expect(failed).toMatchObject({ ok: false, error: { kind: 'http', status: 500 } });
  });

  it('maps a network failure to network', async () => {
    server.use(http.get('*/campaignHACKATHON/:id', () => HttpResponse.error()));
    const result = await apiGet({
      path: apiPaths.campaignJobs('119'),
      schema: campaignJobsResponseSchema,
    });
    expect(result).toMatchObject({ ok: false, error: { kind: 'network' } });
  });

  it('reports a shape mismatch as a parse error with the failing paths', async () => {
    server.use(http.get('*/campaignHACKATHON/:id', () => HttpResponse.json([{ roomName: 42 }])));
    const result = await apiGet({
      path: apiPaths.campaignJobs('119'),
      schema: campaignJobsResponseSchema,
    });
    expect(result).toMatchObject({ ok: false, error: { kind: 'parse' } });
    expect(!result.ok && result.error.kind === 'parse' && result.error.issues[0]).toMatch(
      /^0\.roomName:/,
    );
  });

  it('reports a non-JSON body as a parse error', async () => {
    server.use(
      http.get('*/campaignHACKATHON/:id', () => HttpResponse.text('<html>Bad Request</html>')),
    );
    const result = await apiGet({ path: apiPaths.campaignJobs('119'), schema: z.unknown() });
    expect(result).toMatchObject({ ok: false, error: { kind: 'parse' } });
  });

  it('times out', async () => {
    server.use(
      http.get('*/campaignHACKATHON/:id', async () => {
        await delay(500);
        return HttpResponse.json([]);
      }),
    );
    const result = await apiGet({
      path: apiPaths.campaignJobs('119'),
      schema: campaignJobsResponseSchema,
      timeoutMs: 20,
    });
    expect(result).toMatchObject({ ok: false, error: { kind: 'timeout', timeoutMs: 20 } });
  });

  it('re-throws when the caller aborts, so the query layer sees a cancellation', async () => {
    server.use(
      http.get('*/campaignHACKATHON/:id', async () => {
        await delay(500);
        return HttpResponse.json([]);
      }),
    );
    const controller = new AbortController();
    const pending = apiGet({
      path: apiPaths.campaignJobs('119'),
      schema: campaignJobsResponseSchema,
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toThrow();
  });
});
