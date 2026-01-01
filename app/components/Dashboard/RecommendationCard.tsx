// app/components/Dashboard/RecommendationCard.tsx
import { Button, Tag, Tooltip } from 'antd';
import * as React from 'react';
import { IPlayerRecommendation, ValueIndicator, Urgency } from '../../lib/models/EnhancedVOR';
import { IPlayerExtended } from '../../lib/models/Player';

interface IRecommendationCardProps {
  recommendation: IPlayerRecommendation;
  onDraft: (player: IPlayerExtended) => void;
  onViewDetails: (recommendation: IPlayerRecommendation) => void;
  rank: number;
}

const VALUE_COLORS: Record<ValueIndicator, string> = {
  steal: 'green',
  'good-value': 'blue',
  fair: 'default',
  reach: 'orange',
  avoid: 'red',
};

const URGENCY_COLORS: Record<Urgency, string> = {
  'must-draft': 'red',
  high: 'orange',
  medium: 'blue',
  low: 'default',
};

/**
 * Card displaying a recommended player with VOR breakdown,
 * value indicator, and action buttons.
 */
export default function RecommendationCard({
  recommendation,
  onDraft,
  onViewDetails,
  rank,
}: IRecommendationCardProps) {
  const { player, enhancedVOR, reasons, urgency, valueIndicator } = recommendation;
  const adpSign = enhancedVOR.adpDiff >= 0 ? '+' : '';

  return (
    <div className="RecommendationCard">
      <div className="RecommendationCard-Rank">{rank}</div>
      <div className="RecommendationCard-Content">
        <div className="RecommendationCard-Header">
          <span className="RecommendationCard-Name">{player.name}</span>
          <Tag>{player.pos}</Tag>
          <span className="RecommendationCard-Team">{player.team}</span>
        </div>

        <div className="RecommendationCard-Stats">
          <Tooltip title={`Base VOR: ${enhancedVOR.baseVOR.toFixed(0)} + Risk: ${enhancedVOR.riskAdjustment.toFixed(1)} + Schedule: ${enhancedVOR.scheduleAdjustment.toFixed(1)} + Scarcity: ${enhancedVOR.scarcityPremium.toFixed(1)}`}>
            <span className="RecommendationCard-VOR">
              VOR: {enhancedVOR.baseVOR.toFixed(0)} → {enhancedVOR.enhancedVOR.toFixed(0)}
            </span>
          </Tooltip>
          <Tooltip title="Your rank vs ADP (positive = value)">
            <span className="RecommendationCard-ADP">
              ADP: {adpSign}{enhancedVOR.adpDiff}
            </span>
          </Tooltip>
        </div>

        <div className="RecommendationCard-Indicators">
          <Tag color={VALUE_COLORS[valueIndicator]}>{valueIndicator}</Tag>
          <Tag color={URGENCY_COLORS[urgency]}>{urgency}</Tag>
        </div>

        <div className="RecommendationCard-Reasons">
          {reasons.slice(0, 2).map((reason, idx) => (
            <span key={idx} className="RecommendationCard-Reason small">
              {reason}
            </span>
          ))}
        </div>
      </div>

      <div className="RecommendationCard-Actions">
        <Button type="primary" size="small" onClick={() => onDraft(player)}>
          Draft
        </Button>
        <Button size="small" onClick={() => onViewDetails(recommendation)}>
          Details
        </Button>
      </div>
    </div>
  );
}
