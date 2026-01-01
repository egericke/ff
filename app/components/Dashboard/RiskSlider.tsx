// app/components/Dashboard/RiskSlider.tsx
import { Slider, Tooltip } from 'antd';
import * as React from 'react';

interface IRiskSliderProps {
  value: number;
  onChange: (value: number) => void;
}

/**
 * Risk tolerance slider for adjusting VOR calculations.
 * - Conservative (0.2): Heavily penalizes risky players
 * - Balanced (0.5): Moderate risk adjustments
 * - Aggressive (0.8): Embraces high-upside players
 */
export default function RiskSlider({ value, onChange }: IRiskSliderProps) {
  const getRiskLabel = (val: number): string => {
    if (val <= 0.35) return 'Conservative';
    if (val <= 0.65) return 'Balanced';
    return 'Aggressive';
  };

  const getRiskDescription = (val: number): string => {
    if (val <= 0.35) return 'Prioritizes safe, consistent players';
    if (val <= 0.65) return 'Balanced risk/reward approach';
    return 'Embraces high-upside, boom/bust players';
  };

  return (
    <div className="RiskSlider">
      <div className="RiskSlider-Header">
        <span className="RiskSlider-Label">Risk Tolerance</span>
        <Tooltip title={getRiskDescription(value)}>
          <span className="RiskSlider-Value">{getRiskLabel(value)}</span>
        </Tooltip>
      </div>
      <Slider
        min={0.1}
        max={0.9}
        step={0.1}
        value={value}
        onChange={onChange}
        marks={{
          0.2: 'Safe',
          0.5: 'Balanced',
          0.8: 'Risky',
        }}
      />
    </div>
  );
}
