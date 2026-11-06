import { Card } from '@/components/ui/Card';
import { Hint } from '@/components/ui/Hint';
import { formatClock, type TimelineTrack } from '@/domain/room';
import { cn } from '@/lib/cn';
import { checkMeta, riskMeta, TONE_FILL_CLASSES } from '@/lib/statusMeta';

interface SessionTimelineProps {
  tracks: TimelineTrack[];
}

/**
 * Where in each segment the analysis made its observations. Decorative: the
 * same observations are listed, with timestamps, under "Proctoring checks".
 */
export function SessionTimeline({ tracks }: SessionTimelineProps) {
  return (
    <Card
      title="Session timeline"
      description="Each mark is one observation. Tracks run to the last timestamp seen in the segment, because the API sends no segment length."
    >
      <ul aria-hidden="true" className="space-y-2.5">
        {tracks.map((track) => (
          <li
            key={track.segmentId}
            className="grid grid-cols-[4.5rem_1fr_2.75rem] items-center gap-3"
          >
            <span className="tabular text-xs text-muted">Segment {track.segmentIndex}</span>
            <div className="relative h-6">
              <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-sunken" />
              {track.markers.map((marker) => {
                const elevated = marker.risk !== 'LOW';
                return (
                  <Hint
                    key={marker.id}
                    label={`${marker.timestamp} · ${checkMeta(marker.checkKey).label} · ${riskMeta(marker.risk).label}`}
                  >
                    <span
                      className={cn(
                        'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface',
                        elevated ? 'size-3.5' : 'size-2',
                        TONE_FILL_CLASSES[riskMeta(marker.risk).tone],
                      )}
                      style={{ left: `${Math.min(100, Math.max(0, marker.position * 100))}%` }}
                    />
                  </Hint>
                );
              })}
            </div>
            <span className="tabular text-right font-mono text-xs text-muted">
              {formatClock(track.extentSeconds)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
