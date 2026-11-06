/**
 * Mock-only switches that force each async state, so a reviewer can see
 * loading, error, empty and unauthorised screens without touching the network.
 * Set from the data-source menu or with `?scenario=slow|error|empty|...`.
 */
export const SCENARIOS = ['default', 'slow', 'error', 'unauthorized', 'empty', 'offline'] as const;
export type Scenario = (typeof SCENARIOS)[number];

export const SCENARIO_LABELS: Record<Scenario, string> = {
  default: 'Normal',
  slow: 'Slow network',
  error: 'Server error',
  unauthorized: 'Unauthorised',
  empty: 'Empty responses',
  offline: 'Network failure',
};

const STORAGE_KEY = 'readie:mock-scenario';
const QUERY_PARAM = 'scenario';

export function isScenario(value: string | null): value is Scenario {
  return SCENARIOS.some((scenario) => scenario === value);
}

function readSaved(): Scenario {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get(QUERY_PARAM);
    if (isScenario(fromUrl)) return fromUrl;
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    return isScenario(saved) ? saved : 'default';
  } catch {
    return 'default';
  }
}

let current: Scenario = readSaved();

export function getScenario(): Scenario {
  return current;
}

export function setScenario(scenario: Scenario): void {
  current = scenario;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, scenario);
  } catch {
    // The scenario still applies for this page load.
  }
}
