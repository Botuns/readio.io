import { describe, expect, it } from 'vitest';
import { countByStatus, isVerificationStatus, matchesEmail, selectJobs } from './jobs';
import type { CampaignJob } from './types';

function job(overrides: Partial<CampaignJob>): CampaignJob {
  return {
    roomName: 'room',
    campaignId: 119,
    candidateName: null,
    candidateEmail: 'someone@example.com',
    jobTitle: null,
    submittedAt: null,
    verificationStatus: 'IN_PROGRESS',
    analysisProgress: 0,
    ...overrides,
  };
}

const JOBS: CampaignJob[] = [
  job({
    roomName: 'a',
    candidateEmail: 'Steph@Readie.io',
    submittedAt: 300,
    verificationStatus: 'COMPLETED',
  }),
  job({ roomName: 'b', candidateEmail: 'kofi@example.com', submittedAt: 100 }),
  job({ roomName: 'c', candidateEmail: 'stephen@example.com', submittedAt: null }),
  job({
    roomName: 'd',
    candidateEmail: 'amara@example.com',
    submittedAt: 200,
    verificationStatus: 'FAILED',
  }),
];

const names = (jobs: CampaignJob[]) => jobs.map((item) => item.roomName);

describe('selectJobs', () => {
  it('sorts newest first by default order and puts missing timestamps last', () => {
    expect(names(selectJobs(JOBS, { query: '', sort: 'submitted_desc' }))).toEqual([
      'a',
      'd',
      'b',
      'c',
    ]);
  });

  it('sorts oldest first and still puts missing timestamps last', () => {
    expect(names(selectJobs(JOBS, { query: '', sort: 'submitted_asc' }))).toEqual([
      'b',
      'd',
      'a',
      'c',
    ]);
  });

  it('filters by status', () => {
    expect(
      names(selectJobs(JOBS, { status: 'FAILED', query: '', sort: 'submitted_desc' })),
    ).toEqual(['d']);
  });

  it('searches the email case-insensitively and ignores surrounding spaces', () => {
    expect(names(selectJobs(JOBS, { query: '  STEPH ', sort: 'submitted_desc' }))).toEqual([
      'a',
      'c',
    ]);
  });

  it('combines status and search', () => {
    const result = selectJobs(JOBS, {
      status: 'COMPLETED',
      query: 'steph',
      sort: 'submitted_desc',
    });
    expect(names(result)).toEqual(['a']);
  });

  it('returns nothing when no job matches', () => {
    expect(selectJobs(JOBS, { status: 'FAILED', query: 'steph', sort: 'submitted_desc' })).toEqual(
      [],
    );
  });

  it('does not mutate its input', () => {
    const before = names(JOBS);
    selectJobs(JOBS, { query: '', sort: 'submitted_asc' });
    expect(names(JOBS)).toEqual(before);
  });
});

describe('job helpers', () => {
  it('counts every status, including zero counts', () => {
    expect(countByStatus(JOBS)).toEqual({ COMPLETED: 1, IN_PROGRESS: 2, FAILED: 1 });
    expect(countByStatus([])).toEqual({ COMPLETED: 0, IN_PROGRESS: 0, FAILED: 0 });
  });

  it('matches every job on an empty query', () => {
    expect(JOBS.every((item) => matchesEmail(item, '   '))).toBe(true);
  });

  it('narrows status strings', () => {
    expect(isVerificationStatus('FAILED')).toBe(true);
    expect(isVerificationStatus('failed')).toBe(false);
  });
});
