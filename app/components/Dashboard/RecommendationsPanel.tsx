// app/components/Dashboard/RecommendationsPanel.tsx
import * as React from 'react';
import { IPlayerRecommendation } from '../../lib/models/EnhancedVOR';
import { IPlayerExtended } from '../../lib/models/Player';
import RecommendationCard from './RecommendationCard';

interface IRecommendationsPanelProps {
  recommendations: IPlayerRecommendation[];
  onDraft: (player: IPlayerExtended) => void;
  onViewDetails: (player: IPlayerExtended) => void;
  currentPick: number;
  trackedTeam: number;
}

/**
 * Panel displaying top player recommendations with
 * VOR breakdowns and draft actions.
 */
export default function RecommendationsPanel({
  recommendations,
  onDraft,
  onViewDetails,
  currentPick,
  trackedTeam,
}: IRecommendationsPanelProps) {
  const round = Math.floor(currentPick / 10) + 1;
  const pickInRound = (currentPick % 10) + 1;

  return (
    <div className="RecommendationsPanel Section">
      <header>
        <h3>Top Recommendations</h3>
        <span className="RecommendationsPanel-Pick">
          Round {round} - Pick {pickInRound}
        </span>
      </header>

      <div className="RecommendationsPanel-List">
        {recommendations.length === 0 ? (
          <p className="RecommendationsPanel-Empty">
            No recommendations available
          </p>
        ) : (
          recommendations.map((rec, idx) => (
            <RecommendationCard
              key={rec.player.key}
              recommendation={rec}
              onDraft={onDraft}
              onViewDetails={onViewDetails}
              rank={idx + 1}
            />
          ))
        )}
      </div>
    </div>
  );
}
