import { delay, http, HttpResponse } from 'msw';
import { assertNever } from '@/domain/assertNever';
import { campaignFixtures, roomFixtures } from './fixtures';
import { getScenario, type Scenario } from './scenarios';

const IS_TEST = import.meta.env.MODE === 'test';

function latencyMs(scenario: Scenario): number {
  if (IS_TEST) return 0;
  if (scenario === 'slow') return 3000 + Math.random() * 1500;
  return 300 + Math.random() * 500;
}

function unauthorized(request: Request): Response {
  return HttpResponse.json(
    {
      timestamp: new Date().toISOString(),
      status: 401,
      error: 'Unauthorized',
      path: new URL(request.url).pathname,
    },
    { status: 401 },
  );
}

/** Applies the active scenario, or returns null to serve the fixture. */
async function scenarioResponse(request: Request): Promise<Response | null> {
  const scenario = getScenario();
  await delay(latencyMs(scenario));
  switch (scenario) {
    case 'default':
    case 'slow':
      return null;
    case 'error':
      return HttpResponse.json(
        { error: 'Unable to retrieve campaign recording rooms' },
        { status: 500 },
      );
    case 'unauthorized':
      return unauthorized(request);
    case 'empty':
      return HttpResponse.json([]);
    case 'offline':
      return HttpResponse.error();
    default:
      return assertNever(scenario);
  }
}

/**
 * Mirrors the live API's behaviour as probed: unknown campaigns and rooms
 * answer `200 []`, and a non-numeric campaign id answers 401.
 */
export const handlers = [
  http.get('*/campaignHACKATHON/:campaignId', async ({ params, request }) => {
    const forced = await scenarioResponse(request);
    if (forced !== null) return forced;
    const campaignId = String(params.campaignId);
    if (!/^\d+$/.test(campaignId)) return unauthorized(request);
    return HttpResponse.json(campaignFixtures[campaignId] ?? []);
  }),

  http.get('*/roomsHACKATHON/:roomName', async ({ params, request }) => {
    const forced = await scenarioResponse(request);
    if (forced !== null) return forced;
    return HttpResponse.json(roomFixtures[String(params.roomName)] ?? []);
  }),
];
