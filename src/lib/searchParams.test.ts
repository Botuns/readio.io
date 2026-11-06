import { describe, expect, it } from 'vitest';
import { campaignSearchParams } from '@/features/campaign/campaignSearchParams';
import { roomSearchParams } from '@/features/room/roomSearchParams';

describe('campaign search params', () => {
  it('applies defaults when the URL has no params', () => {
    expect(campaignSearchParams.schema.parse({})).toEqual({ q: '', sort: 'submitted_desc' });
  });

  it('accepts valid values', () => {
    expect(
      campaignSearchParams.schema.parse({ status: 'FAILED', q: 'steph', sort: 'submitted_asc' }),
    ).toEqual({
      status: 'FAILED',
      q: 'steph',
      sort: 'submitted_asc',
    });
  });

  it('falls back field by field instead of rejecting the whole URL', () => {
    expect(
      campaignSearchParams.schema.parse({ status: 'failed', q: 'steph', sort: 'newest' }),
    ).toEqual({
      status: undefined,
      q: 'steph',
      sort: 'submitted_desc',
    });
  });

  it('drops an over-long query', () => {
    expect(campaignSearchParams.schema.parse({ q: 'x'.repeat(500) }).q).toBe('');
  });
});

describe('room search params', () => {
  it('defaults to the transcript tab', () => {
    expect(roomSearchParams.schema.parse({})).toEqual({ tab: 'transcript' });
  });

  it.each(['transcript', 'identity', 'integrity'])('accepts tab=%s', (tab) => {
    expect(roomSearchParams.schema.parse({ tab }).tab).toBe(tab);
  });

  it.each(['Integrity', 'audit', '', '1'])('falls back for tab=%j', (tab) => {
    expect(roomSearchParams.schema.parse({ tab }).tab).toBe('transcript');
  });

  it('accepts a segment id and rejects anything that is not an id', () => {
    expect(roomSearchParams.schema.parse({ segment: 'EG_FDFGBxexMUG6' }).segment).toBe(
      'EG_FDFGBxexMUG6',
    );
    expect(roomSearchParams.schema.parse({ segment: '<script>' }).segment).toBeUndefined();
  });
});
