// app/components/Dashboard/ScarcityPanel.tsx
import * as React from 'react';
import { IScarcityPremium, IDropOffAlert } from '../../lib/models/Scarcity';
import ScarcityMeter from './ScarcityMeter';

interface IScarcityPanelProps {
  premiums: IScarcityPremium[];
  alerts: IDropOffAlert[];
}

/**
 * Panel displaying positional scarcity across all positions
 * with drop-off alerts.
 */
export default function ScarcityPanel({ premiums, alerts }: IScarcityPanelProps) {
  // Filter to main positions only
  const mainPositions = premiums.filter((p) =>
    ['QB', 'RB', 'WR', 'TE'].includes(p.position)
  );

  return (
    <div className="ScarcityPanel Section">
      <header>
        <h3>Position Scarcity</h3>
      </header>

      <div className="ScarcityPanel-Meters">
        {mainPositions.map((premium) => (
          <ScarcityMeter
            key={premium.position}
            position={premium.position}
            severity={premium.severity}
            tier1Remaining={0}
            tier2Remaining={0}
            totalRemaining={0}
          />
        ))}
      </div>

      {alerts.length > 0 && (
        <div className="ScarcityPanel-Alerts">
          <h4>Alerts</h4>
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`ScarcityPanel-Alert severity-${alert.severity}`}
            >
              <span className="alert-icon">
                {alert.severity === 'critical' ? '🔴' : '🟡'}
              </span>
              <span>
                {alert.position} cliff in {alert.picksUntilDrop} picks!
                <span className="small">
                  {' '}(drop of {alert.dropOffPoints.toFixed(0)} VOR)
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
