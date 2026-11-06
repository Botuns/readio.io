import { describe, expect, it } from 'vitest';
import { toRoomEvaluation } from '@/api/mappers';
import { campaignFixtures, roomFixtures } from '@/mocks/fixtures';
import {
  buildTimeline,
  collapseTranscript,
  collectIdentity,
  countSegments,
  countTranscriptEntries,
  formatClock,
  groupTranscript,
  identityAnomalies,
  scopeSegments,
  searchTranscript,
  summariseIntegrity,
  summariseVerdict,
  worstRisk,
  worstVerdict,
} from './room';

function demoRoom(emailPrefix: string) {
  const job = (campaignFixtures['900'] ?? []).find((item) =>
    item.candidateEmail.startsWith(emailPrefix),
  );
  const records = job === undefined ? undefined : roomFixtures[job.roomName];
  if (job === undefined || records === undefined)
    throw new Error(`No demo room for ${emailPrefix}`);
  return toRoomEvaluation(job.roomName, records);
}

describe('worst-case helpers', () => {
  it('ranks unknown risk above low and below medium', () => {
    expect(worstRisk(['LOW', 'UNKNOWN'])).toBe('UNKNOWN');
    expect(worstRisk(['UNKNOWN', 'MEDIUM', 'LOW'])).toBe('MEDIUM');
    expect(worstRisk(['MEDIUM', 'HIGH'])).toBe('HIGH');
    expect(worstRisk([])).toBeNull();
  });

  it('picks the worst verdict', () => {
    expect(worstVerdict(['PASSED', 'WARNING'])).toBe('WARNING');
    expect(worstVerdict(['FAILED', 'PASSED'])).toBe('FAILED');
    expect(worstVerdict([])).toBeNull();
  });
});

describe('verdict summary', () => {
  it.each([
    ['passed', 'PASSED', false],
    ['warning', 'WARNING', true],
    ['failed', 'FAILED', true],
  ] as const)('rolls up the %s demo room', (prefix, verdict, humanReview) => {
    const summary = summariseVerdict(demoRoom(prefix).segments);
    expect(summary.verdict).toBe(verdict);
    expect(summary.humanReviewRequired).toBe(humanReview);
  });

  it('reports no verdict when nothing is analysed', () => {
    const summary = summariseVerdict(demoRoom('recording-failed').segments);
    expect(summary).toEqual({
      verdict: null,
      humanReviewRequired: false,
      dispositions: [],
      analysedCount: 0,
    });
  });
});

describe('integrity summary', () => {
  it('raises no flags for a clean room', () => {
    const summary = summariseIntegrity(demoRoom('passed').segments);
    expect(summary?.overallRisk).toBe('LOW');
    expect(summary?.flagged).toEqual([]);
    expect(summary?.audioAnomalyCount).toBe(0);
  });

  it('counts audio anomalies and flags elevated observations', () => {
    const summary = summariseIntegrity(demoRoom('warning').segments);
    expect(summary?.overallRisk).toBe('MEDIUM');
    expect(summary?.audioAnomalyCount).toBe(2);
    expect(summary?.flagged.map((item) => item.kind)).toEqual([
      'observation',
      'observation',
      'observation',
      'observation',
      'multiple_people',
    ]);
  });

  it('uses the worst risk and lowest confidence per check', () => {
    const summary = summariseIntegrity(demoRoom('failed').segments);
    const continuity = summary?.checks.find((check) => check.key === 'personContinuity');
    expect(summary?.overallRisk).toBe('HIGH');
    expect(continuity?.risk).toBe('HIGH');
    expect(continuity?.lowestConfidence).toBe(0.9);
  });

  it('orders flags by segment and then by time', () => {
    const flagged = summariseIntegrity(demoRoom('failed').segments)?.flagged ?? [];
    const timed = flagged
      .filter((item) => item.offsetSeconds !== null)
      .map((item) => item.offsetSeconds);
    expect(timed).toEqual([...timed].sort((a, b) => (a ?? 0) - (b ?? 0)));
  });

  it('is null when no segment has results', () => {
    expect(summariseIntegrity(demoRoom('recording-failed').segments)).toBeNull();
  });
});

describe('identity', () => {
  it('finds no anomalies in a consistent, confident match', () => {
    const [entry] = collectIdentity(demoRoom('passed').segments);
    expect(entry).toBeDefined();
    expect(entry === undefined ? [] : identityAnomalies(entry)).toEqual([]);
  });

  it('lists conflicts first, then multiple people and low confidence', () => {
    const [entry] = collectIdentity(demoRoom('warning').segments);
    const anomalies = entry === undefined ? [] : identityAnomalies(entry);
    expect(anomalies.map((item) => [item.severity, item.title])).toEqual([
      ['HIGH', 'Conflicting evidence'],
      ['MEDIUM', 'Multiple people detected'],
      ['MEDIUM', 'Confidence below the review threshold'],
    ]);
  });

  it('reports an inconsistent decision as high severity', () => {
    const [entry] = collectIdentity(demoRoom('failed').segments);
    const anomalies = entry === undefined ? [] : identityAnomalies(entry);
    expect(anomalies.filter((item) => item.severity === 'HIGH')).toHaveLength(3);
  });
});

describe('segments and transcript', () => {
  const room = demoRoom('processing');

  it('counts segments by state', () => {
    expect(countSegments(room.segments)).toEqual({
      ANALYSED: 1,
      PROCESSING: 1,
      PENDING: 1,
      FAILED: 0,
      total: 3,
    });
  });

  it('scopes to one segment, or to all when the id is unknown', () => {
    const [first] = room.segments;
    expect(scopeSegments(room, first?.id)).toEqual([first]);
    expect(scopeSegments(room, 'nope')).toHaveLength(3);
    expect(scopeSegments(room, undefined)).toHaveLength(3);
  });

  it('merges consecutive unanalysed segments into one gap', () => {
    const blocks = collapseTranscript(groupTranscript(room.segments));
    expect(blocks.map((block) => block.kind)).toEqual(['segment', 'gap']);
    const gap = blocks[1];
    expect(gap?.kind === 'gap' ? gap.segments.map((segment) => segment.index) : []).toEqual([2, 3]);
  });

  it('searches transcript text case-insensitively', () => {
    const groups = groupTranscript(demoRoom('passed').segments);
    const total = countTranscriptEntries(groups);
    const matches = countTranscriptEntries(searchTranscript(groups, 'THANK YOU'));
    expect(matches).toBeGreaterThan(0);
    expect(matches).toBeLessThan(total);
    expect(countTranscriptEntries(searchTranscript(groups, ''))).toBe(total);
    expect(searchTranscript(groups, 'zzzz-no-match')).toEqual([]);
  });
});

describe('timeline', () => {
  it('places every marker between 0 and 1 in time order', () => {
    const tracks = buildTimeline(demoRoom('failed').segments);
    expect(tracks).toHaveLength(1);
    const positions = tracks.flatMap((track) => track.markers.map((marker) => marker.position));
    expect(positions.every((position) => position >= 0 && position <= 1)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('formats clock positions', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(237)).toBe('03:57');
    expect(formatClock(3723)).toBe('1:02:03');
  });
});
