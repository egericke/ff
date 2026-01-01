// app/components/Dashboard/PlayerDetailPopup.tsx
import { Button, Modal, Progress, Tag } from 'antd';
import * as React from 'react';
import { IEnhancedVOR } from '../../lib/models/EnhancedVOR';
import { IPlayerExtended } from '../../lib/models/Player';

interface IPlayerDetailPopupProps {
  open: boolean;
  player: IPlayerExtended | null;
  enhancedVOR: IEnhancedVOR | null;
  onClose: () => void;
  onDraft: (player: IPlayerExtended) => void;
}

/**
 * Detailed popup showing complete VOR breakdown, risk profile,
 * and schedule analysis for a player.
 */
export default function PlayerDetailPopup({
  open,
  player,
  enhancedVOR,
  onClose,
  onDraft,
}: IPlayerDetailPopupProps) {
  if (!player || !enhancedVOR) return null;

  const riskProfile = player.risk?.riskProfile;
  const formatAdjustment = (val: number): string => {
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(0)}`;
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={`${player.name} - ${player.pos} - ${player.team}`}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button key="draft" type="primary" onClick={() => onDraft(player)}>
          Draft Player
        </Button>,
      ]}
    >
      <div className="PlayerDetail">
        <section className="PlayerDetail-Projection">
          <h4>Projection</h4>
          <p>
            <strong>{enhancedVOR.forecast} pts</strong> (Rank: {enhancedVOR.positionRank})
          </p>
        </section>

        <section className="PlayerDetail-VOR">
          <h4>VOR Breakdown</h4>
          <div className="PlayerDetail-VOR-Row">
            <span>Base VOR:</span>
            <span>{enhancedVOR.baseVOR}</span>
          </div>
          <div className="PlayerDetail-VOR-Row">
            <span>+ Scarcity:</span>
            <span>{formatAdjustment(enhancedVOR.scarcityPremium)}</span>
          </div>
          <div className="PlayerDetail-VOR-Row">
            <span>+ Schedule:</span>
            <span>{formatAdjustment(enhancedVOR.scheduleAdjustment)}</span>
          </div>
          <div className="PlayerDetail-VOR-Row">
            <span>+ Risk Adj:</span>
            <span>{formatAdjustment(enhancedVOR.riskAdjustment)}</span>
          </div>
          <div className="PlayerDetail-VOR-Row PlayerDetail-VOR-Total">
            <span>= FINAL VOR:</span>
            <span><strong>{enhancedVOR.enhancedVOR.toFixed(0)}</strong></span>
          </div>
        </section>

        {riskProfile && (
          <section className="PlayerDetail-Risk">
            <h4>Risk Profile</h4>
            <div className="PlayerDetail-Risk-Row">
              <span>Injury Risk:</span>
              <Progress
                percent={riskProfile.injuryScore}
                size="small"
                status={riskProfile.injuryScore > 50 ? 'exception' : 'normal'}
              />
              <span>{riskProfile.injuryScore}%</span>
            </div>
            <div className="PlayerDetail-Risk-Row">
              <span>Consistency:</span>
              <Progress
                percent={riskProfile.consistencyScore * 100}
                size="small"
                status="active"
              />
            </div>
            <div className="PlayerDetail-Risk-Row">
              <span>Floor:</span>
              <Tag>{riskProfile.floor} pts</Tag>
              <span>Ceiling:</span>
              <Tag>{riskProfile.ceiling} pts</Tag>
            </div>
          </section>
        )}

        <section className="PlayerDetail-ADP">
          <h4>ADP Value</h4>
          <p>
            Your Rank: {enhancedVOR.overallRank} | ADP: {player.std}
            {enhancedVOR.adpDiff > 0 && (
              <Tag color="green">+{enhancedVOR.adpDiff} value</Tag>
            )}
            {enhancedVOR.adpDiff < 0 && (
              <Tag color="red">{enhancedVOR.adpDiff} reach</Tag>
            )}
          </p>
        </section>
      </div>
    </Modal>
  );
}
