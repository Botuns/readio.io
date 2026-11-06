import { describe, expect, it } from 'vitest';
import { campaignFixtures, roomFixtures } from '@/mocks/fixtures';
import {
  parseApiTimestamp,
  parseClock,
  toCampaignJob,
  toRiskLevel,
  toRoomEvaluation,
  toVerdict,
} from './mappers';

const SAMPLE_ROOM = 'campaign_119interview~~stephtester1@readie.io~~a3953942a9f2';

function roomFixture(roomName: string) {
  const records = roomFixtures[roomName];
  if (records === undefined) throw new Error(`No fixture for ${roomName}`);
  return toRoomEvaluation(roomName, records);
}

describe('parseApiTimestamp', () => {
  it('reads the campaign format with an offset', () => {
    expect(parseApiTimestamp('2026-10-27T09:17:20.822+00:00')).toBe(
      Date.UTC(2026, 9, 27, 9, 17, 20, 822),
    );
  });

  it('reads the room format (microseconds, no offset) as UTC', () => {
    expect(parseApiTimestamp('2026-10-27T09:17:20.822875')).toBe(
      Date.UTC(2026, 9, 27, 9, 17, 20, 822),
    );
  });

  it('reads the space-separated assessment format', () => {
    expect(parseApiTimestamp('2026-10-23 13:13:05.000000')).toBe(Date.UTC(2026, 9, 23, 13, 13, 5));
  });

  it('respects a non-UTC offset', () => {
    expect(parseApiTimestamp('2026-10-27T10:17:20+01:00')).toBe(Date.UTC(2026, 9, 27, 9, 17, 20));
  });

  it.each([null, undefined, '', '   ', 'yesterday', '2026-13-45T99:00:00'])(
    'returns null for %j',
    (value) => {
      expect(parseApiTimestamp(value)).toBeNull();
    },
  );
});

describe('parseClock', () => {
  it.each([
    ['00:00', 0],
    ['03:57', 237],
    ['1:02:03', 3723],
  ])('parses %s', (value, seconds) => {
    expect(parseClock(value)).toBe(seconds);
  });

  it.each([null, undefined, '', 'soon', '12'])('returns null for %j', (value) => {
    expect(parseClock(value)).toBeNull();
  });
});

describe('toCampaignJob', () => {
  const [first] = campaignFixtures['119'] ?? [];
  if (first === undefined) throw new Error('Campaign 119 fixture is empty');

  it('derives COMPLETED from analyticsCompleted', () => {
    const job = toCampaignJob({
      ...first,
      analyticsCompleted: true,
      percentageAnalyticCompleted: 100,
    });
    expect(job.verificationStatus).toBe('COMPLETED');
    expect(job.analysisProgress).toBe(100);
  });

  it('derives IN_PROGRESS and keeps the percentage', () => {
    const job = toCampaignJob({
      ...first,
      analyticsCompleted: false,
      percentageAnalyticCompleted: 18.18182,
    });
    expect(job.verificationStatus).toBe('IN_PROGRESS');
    expect(job.analysisProgress).toBeCloseTo(18.18182);
  });

  it('turns a missing or invalid timestamp into null', () => {
    expect(toCampaignJob({ ...first, candidateDateCreated: null }).submittedAt).toBeNull();
    expect(toCampaignJob({ ...first, candidateDateCreated: 'n/a' }).submittedAt).toBeNull();
  });

  it('treats a blank name as missing and clamps progress', () => {
    const job = toCampaignJob({ ...first, candidateName: '  ', percentageAnalyticCompleted: 140 });
    expect(job.candidateName).toBeNull();
    expect(job.analysisProgress).toBe(100);
  });
});

describe('status mapping', () => {
  it.each([
    ['LOW', 'LOW'],
    ['low', 'LOW'],
    ['MEDIUM', 'MEDIUM'],
    ['HIGH', 'HIGH'],
    ['CRITICAL', 'HIGH'],
    ['SOMETHING_NEW', 'UNKNOWN'],
  ])('maps risk %s to %s', (raw, expected) => {
    expect(toRiskLevel(raw)).toBe(expected);
  });

  it('maps the observed dispositions', () => {
    expect(toVerdict('PASS_WITH_LOW_RISK', false, 'LOW')).toBe('PASSED');
    expect(toVerdict('REVIEW_REQUIRED', true, 'LOW')).toBe('WARNING');
  });

  it('never passes a session that needs human review or carries elevated risk', () => {
    expect(toVerdict('PASS_WITH_LOW_RISK', true, 'LOW')).toBe('WARNING');
    expect(toVerdict('PASS_WITH_LOW_RISK', false, 'MEDIUM')).toBe('WARNING');
    expect(toVerdict('PASS_WITH_LOW_RISK', false, 'HIGH')).toBe('FAILED');
  });

  it('fails fail-like dispositions and warns on unknown ones', () => {
    expect(toVerdict('FAIL_HIGH_RISK', true, 'LOW')).toBe('FAILED');
    expect(toVerdict('REJECTED', false, null)).toBe('FAILED');
    expect(toVerdict('SOMETHING_NEW', false, 'LOW')).toBe('WARNING');
  });
});

describe('toRoomEvaluation', () => {
  it('maps the sample room', () => {
    const room = roomFixture(SAMPLE_ROOM);
    expect(room.campaignId).toBe(119);
    expect(room.segments).toHaveLength(1);
    const [segment] = room.segments;
    expect(segment?.state).toBe('ANALYSED');
    expect(segment?.analysis?.verdict).toBe('WARNING');
    expect(segment?.analysis?.identity).toBeNull();
    expect(segment?.analysis?.integrity?.checks.map((check) => check.key)).toEqual([
      'syntheticVideo',
      'personContinuity',
      'audioVideoConsistency',
      'offScreenAssistance',
    ]);
  });

  it('orders segments chronologically and numbers them from 1', () => {
    for (const [roomName, records] of Object.entries(roomFixtures)) {
      const { segments } = toRoomEvaluation(roomName, records);
      const starts = segments.map((segment) => segment.startedAt ?? Number.MAX_SAFE_INTEGER);
      expect(starts).toEqual([...starts].sort((a, b) => a - b));
      expect(segments.map((segment) => segment.index)).toEqual(
        segments.map((_, position) => position + 1),
      );
    }
  });

  it('gives every segment a unique id, including the one with no record id', () => {
    for (const [roomName, records] of Object.entries(roomFixtures)) {
      const ids = toRoomEvaluation(roomName, records).segments.map((segment) => segment.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('maps speakers and keeps the raw label', () => {
    const entries = Object.entries(roomFixtures).flatMap(([roomName, records]) =>
      toRoomEvaluation(roomName, records).segments.flatMap(
        (segment) => segment.analysis?.transcript ?? [],
      ),
    );
    expect(entries.length).toBeGreaterThan(100);
    expect(new Set(entries.map((entry) => entry.speaker))).toEqual(
      new Set(['INTERVIEWER', 'CANDIDATE', 'PARTICIPANT']),
    );
    expect(entries.find((entry) => entry.rawSpeaker === 'INTERVIEWEE')?.speaker).toBe('CANDIDATE');
  });

  it('marks failed, processing and pending segments', () => {
    const states = Object.entries(roomFixtures).flatMap(([roomName, records]) =>
      toRoomEvaluation(roomName, records).segments.map((segment) => segment.state),
    );
    expect(new Set(states)).toEqual(new Set(['ANALYSED', 'PROCESSING', 'PENDING', 'FAILED']));
  });
});
