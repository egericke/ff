// app/components/Dashboard/__tests__/RiskSlider.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RiskSlider from '../RiskSlider';

// Mock antd Slider
jest.mock('antd', () => ({
  Slider: jest.fn().mockImplementation(({ value, onChange, min, max }) => (
    <input
      data-testid="risk-slider"
      type="range"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  )),
  Tooltip: jest.fn().mockImplementation(({ children }) => children),
}));

describe('RiskSlider', () => {
  const defaultProps = {
    value: 0.5,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the slider with current value', () => {
    render(<RiskSlider {...defaultProps} />);
    const slider = screen.getByTestId('risk-slider');
    expect(slider).toHaveValue('0.5');
  });

  it('should display risk level label', () => {
    render(<RiskSlider {...defaultProps} value={0.2} />);
    expect(screen.getByText(/Conservative/i)).toBeInTheDocument();
  });

  it('should display Balanced for mid-range values', () => {
    render(<RiskSlider {...defaultProps} value={0.5} />);
    expect(screen.getByText(/Balanced/i)).toBeInTheDocument();
  });

  it('should display Aggressive for high values', () => {
    render(<RiskSlider {...defaultProps} value={0.8} />);
    expect(screen.getByText(/Aggressive/i)).toBeInTheDocument();
  });

  it('should call onChange when slider value changes', () => {
    render(<RiskSlider {...defaultProps} />);
    const slider = screen.getByTestId('risk-slider');
    fireEvent.change(slider, { target: { value: '0.8' } });
    expect(defaultProps.onChange).toHaveBeenCalledWith(0.8);
  });
});
