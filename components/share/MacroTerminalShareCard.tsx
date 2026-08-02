import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';
import { MacroGaugeSvg, CARD_GAUGE_PALETTE } from '@/components/macro/MacroGaugeSvg';

const PAD      = 32;
const HEADER_H = 72;
const GAP      = 8;
const FOOTER_H = 24;
const BODY_H   = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - GAP - FOOTER_H - PAD;
const BODY_W   = SHARE_CARD_WIDTH - PAD * 2;
const GAUGE_W  = 380;

// The card has no chart, so the watermark is scoped to the gauge column where it
// sits behind the dial rather than across the summary text.
export const MACRO_TERMINAL_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP, w: GAUGE_W, h: BODY_H,
};

export type MacroTerminalSharePayload = {
  score:       number | null;
  band:        string;
  color:       string;
  headline:    string;
  summary:     string;
  dateStr:     string;
  provisional: boolean;
  coverage:    number;          // 0-1
  sections:    Array<{ title: string; risk: number | null; color: string; weight: number }>;
};

export function MacroTerminalShareCard({ payload }: { payload: MacroTerminalSharePayload }) {
  const { score, band, color, headline, summary, dateStr, provisional, coverage, sections } = payload;

  return (
    <div style={{
      width:           SHARE_CARD_WIDTH,
      height:          SHARE_CARD_HEIGHT,
      backgroundColor: '#0D1117',
      position:        'relative',
      overflow:        'hidden',
      fontFamily:      'ui-monospace, SFMono-Regular, Menlo, monospace',
      display:         'flex',
      flexDirection:   'column',
      padding:         PAD,
      boxSizing:       'border-box',
    }}>
      {/* Header */}
      <div style={{
        height: HEADER_H, flex: `0 0 ${HEADER_H}px`,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#F7F9FC', margin: 0 }}>
            Skyline Macro Terminal
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 0' }}>
            Is the macro environment helping or fighting Bitcoin?
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
          </div>
          <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 4px' }}>{dateStr}</p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            {provisional && (
              <span style={{
                padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                backgroundColor: '#E6B45020', color: '#E6B450',
              }}>
                {(coverage * 100).toFixed(0)}% DATA
              </span>
            )}
            <span style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
              backgroundColor: color + '20', color,
            }}>
              {band}
            </span>
          </div>
        </div>
      </div>

      {/* Body: gauge left, read right */}
      <div style={{
        height: BODY_H, flex: `0 0 ${BODY_H}px`, width: BODY_W,
        marginTop: GAP, marginBottom: GAP,
        display: 'flex', gap: 24,
      }}>
        {/* Gauge column */}
        <div style={{
          width: GAUGE_W, flex: `0 0 ${GAUGE_W}px`,
          backgroundColor: '#161B22', border: '1px solid #21262D', borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <MacroGaugeSvg
            score={score}
            color={color}
            size={330}
            palette={{ ...CARD_GAUGE_PALETTE, gap: '#161B22' }}
            idSuffix="card"
          />
        </div>

        {/* Read column */}
        <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, display: 'inline-block', flexShrink: 0 }} />
            <p style={{ fontSize: 19, fontWeight: 700, color, margin: 0, lineHeight: 1.25 }}>
              {headline}
            </p>
          </div>

          <p style={{
            fontSize: 13, lineHeight: 1.65, color: '#C9D1D9', margin: '14px 0 0',
            fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          }}>
            {summary}
          </p>

          {/* Section scores */}
          <div style={{
            marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #21262D',
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px 16px',
          }}>
            {sections.map(s => (
              <div key={s.title}>
                <p style={{ fontSize: 9, color: '#8B949E', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {s.title}
                </p>
                <p style={{ fontSize: 17, fontWeight: 700, color: s.color, margin: '3px 0 4px' }}>
                  {s.risk == null ? '—' : Math.round(s.risk)}
                  <span style={{ fontSize: 9, fontWeight: 400, color: '#484F58' }}>
                    {' '}· {(s.weight * 100).toFixed(0)}%
                  </span>
                </p>
                <div style={{ height: 3, backgroundColor: '#21262D', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: `${s.risk ?? 0}%`, backgroundColor: s.color,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        flex: '1 1 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {[
            { color: '#35D07F', label: '0-24 Low' },
            { color: '#E6B450', label: '25-49 Moderate' },
            { color: '#F97316', label: '50-74 Elevated' },
            { color: '#FF5C5C', label: '75-100 High' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: l.color, display: 'inline-block' }} />
              <span style={{ fontSize: 10, color: '#8B949E' }}>{l.label}</span>
            </div>
          ))}
        </div>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
