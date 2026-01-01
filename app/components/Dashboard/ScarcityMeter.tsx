// app/components/Dashboard/ScarcityMeter.tsx
import * as React from 'react';
import { Position } from '../../lib/models/Player';
import { ScarcitySeverity } from '../../lib/models/Scarcity';

interface IScarcityMeterProps {
  position: Position;
  severity: ScarcitySeverity;
  tier1Remaining: number;
  tier2Remaining: number;
  totalRemaining: number;
}

/**
 * Visual meter showing positional scarcity during the draft.
 * Displays remaining player tiers and urgency level.
 */
export default function ScarcityMeter({
  position,
  severity,
  tier1Remaining,
  tier2Remaining,
  totalRemaining,
}: IScarcityMeterProps) {
  const getSeverityLabel = (): string | null => {
    if (severity === 'critical') return 'CRIT';
    if (severity === 'high') return 'HIGH';
    return null;
  };

  const getSeverityEmoji = (): string => {
    if (severity === 'critical') return '🔴';
    if (severity === 'high') return '🟡';
    if (severity === 'medium') return '🟡';
    return '🟢';
  };

  // Calculate fill percentage (max 100%)
  const fillPercentage = Math.min((totalRemaining / 40) * 100, 100);

  return (
    <div className={`ScarcityMeter severity-${severity}`}>
      <div className="ScarcityMeter-Header">
        <span className="ScarcityMeter-Position">{position}</span>
        <span className="ScarcityMeter-Indicator">
          {getSeverityEmoji()}
          {getSeverityLabel() && (
            <span className="ScarcityMeter-Label">{getSeverityLabel()}</span>
          )}
        </span>
      </div>
      <div className="ScarcityMeter-Bar">
        <div
          className="ScarcityMeter-Fill"
          style={{ width: `${fillPercentage}%` }}
        />
      </div>
      <div className="ScarcityMeter-Details">
        <span className="small">{tier1Remaining} elite</span>
        <span className="small">{tier2Remaining} starter</span>
      </div>
    </div>
  );
}
