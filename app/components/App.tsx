import * as React from 'react';
import { connect } from 'react-redux';

import Header from './Header';
import MobileSettings from './MobileSettings';
import PickHistoryContainer from './PickHistoryContainer';
import PlayerTableContainer from './PlayerTableContainer';
import RosterModal from './RosterModal';
import ScoringModal from './ScoringModal';
import Settings from './Settings';
import TeamPicks from './TeamPicks';

import { ScarcityPanel, RecommendationsPanel, PlayerDetailPopup, RiskSlider } from './Dashboard';
import { IPlayerExtended } from '../lib/models/Player';
import { DEFAULT_SCARCITY_SETTINGS } from '../lib/models/Scarcity';
import { IRiskSettings, DEFAULT_RISK_SETTINGS } from '../lib/models/Risk';
import { DEFAULT_RECOMMENDATION_SETTINGS, IEnhancedVOR } from '../lib/models/EnhancedVOR';
import { IRoster } from '../lib/models/Team';
import { calculateAllScarcityPremiums, detectDropOffs } from '../lib/engine/scarcity';
import { calculateAllEnhancedVORs } from '../lib/engine/enhancedVOR';
import { getTopRecommendations } from '../lib/engine/recommendations';
import { DEFAULT_SCHEDULE_SETTINGS } from '../lib/models/Schedule';
import { IStoreState } from '../lib/store/store';
import { onPickPlayer } from '../lib/store/actions/teams';

interface IAppProps {
  players: IPlayerExtended[];
  draftedKeys: Set<string>;
  currentPick: number;
  trackedTeam: number;
  rosterFormat: IRoster;
  numberOfTeams: number;
  onPickPlayer: (player: IPlayerExtended) => void;
}

interface IState {
  mobile: boolean;
  riskTolerance: number;
  selectedPlayer: IPlayerExtended | null;
  selectedPlayerVOR: IEnhancedVOR | null;
  showDashboard: boolean;
  showPlayerPopup: boolean;
}

class App extends React.Component<IAppProps, IState> {
  constructor(props: IAppProps) {
    super(props);

    this.state = {
      mobile: false,
      riskTolerance: 0.5,
      selectedPlayer: null,
      selectedPlayerVOR: null,
      showDashboard: true,
      showPlayerPopup: false,
    };
  }

  componentDidMount = () => {
    window.addEventListener('resize', this.mobile);
    this.mobile();
  };

  mobile = () => {
    this.setState({ mobile: window.innerWidth < 700 });
  };

  handleRiskChange = (value: number) => {
    this.setState({ riskTolerance: value });
  };

  handleViewDetails = (recommendation: { player: IPlayerExtended; enhancedVOR: IEnhancedVOR }) => {
    this.setState({
      selectedPlayer: recommendation.player,
      selectedPlayerVOR: recommendation.enhancedVOR,
      showPlayerPopup: true
    });
  };

  handleCloseDetails = () => {
    this.setState({ selectedPlayer: null, selectedPlayerVOR: null, showPlayerPopup: false });
  };

  handleDraft = (player: IPlayerExtended) => {
    this.props.onPickPlayer(player);
    this.setState({ selectedPlayer: null, selectedPlayerVOR: null, showPlayerPopup: false });
  };

  toggleDashboard = () => {
    this.setState((prev) => ({ showDashboard: !prev.showDashboard }));
  };

  // Calculate enhanced VOR data
  getEnhancedData() {
    const { players, draftedKeys, rosterFormat, numberOfTeams } = this.props;
    const { riskTolerance } = this.state;

    // Build risk settings from tolerance
    const riskSettings: IRiskSettings = {
      ...DEFAULT_RISK_SETTINGS,
      riskTolerance,
    };

    // Calculate scarcity premiums
    const scarcityPremiums = calculateAllScarcityPremiums(
      players,
      draftedKeys,
      rosterFormat,
      numberOfTeams,
      DEFAULT_SCARCITY_SETTINGS
    );

    // Detect drop-offs
    const dropOffAlerts = detectDropOffs(
      players,
      draftedKeys,
      DEFAULT_SCARCITY_SETTINGS
    );

    // Calculate enhanced VORs
    const enhancedVORs = calculateAllEnhancedVORs(
      players,
      draftedKeys,
      riskSettings,
      DEFAULT_SCARCITY_SETTINGS,
      DEFAULT_SCHEDULE_SETTINGS,
      rosterFormat,
      numberOfTeams
    );

    // Get needed positions (positions not yet filled)
    const neededPositions = ['QB', 'RB', 'WR', 'TE'] as any[];

    // Get recommendations
    const recommendations = getTopRecommendations(
      enhancedVORs,
      players,
      draftedKeys,
      neededPositions,
      DEFAULT_RECOMMENDATION_SETTINGS
    );

    return { scarcityPremiums, dropOffAlerts, recommendations, enhancedVORs };
  }

  public render() {
    const { currentPick, trackedTeam } = this.props;
    const { mobile, riskTolerance, selectedPlayer, selectedPlayerVOR, showDashboard, showPlayerPopup } = this.state;

    // if it's on mobile, render only the team picker, and PlayerTable
    if (mobile) {
      return (
        <div id="App">
          <MobileSettings />
          <TeamPicks mobile={true} />
          <PlayerTableContainer mobile={true} />

          <RosterModal />
          <ScoringModal />
        </div>
      );
    }

    const { scarcityPremiums, dropOffAlerts, recommendations } = this.getEnhancedData();

    return (
      <div id="App">
        <div className="App-Left-Column">
          <Header />
          <Settings />

          {/* Dashboard Toggle */}
          <button
            className="Dashboard-Toggle"
            onClick={this.toggleDashboard}
            style={{
              margin: '10px',
              padding: '8px 16px',
              background: showDashboard ? '#4CAF50' : '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showDashboard ? 'Hide Advanced VOR' : 'Show Advanced VOR'}
          </button>

          {showDashboard && (
            <div className="Dashboard-Section">
              <RiskSlider
                value={riskTolerance}
                onChange={this.handleRiskChange}
              />
              <ScarcityPanel
                premiums={scarcityPremiums}
                alerts={dropOffAlerts}
              />
            </div>
          )}

          <TeamPicks />
        </div>
        <div className="App-Right-Column">
          {showDashboard && (
            <RecommendationsPanel
              recommendations={recommendations}
              onDraft={this.handleDraft}
              onViewDetails={this.handleViewDetails}
              currentPick={currentPick}
              trackedTeam={trackedTeam}
            />
          )}
          <PickHistoryContainer />
          <PlayerTableContainer />
        </div>
        <RosterModal />
        <ScoringModal />

        {/* Player Detail Popup */}
        {selectedPlayer && selectedPlayerVOR && (
          <PlayerDetailPopup
            open={showPlayerPopup}
            player={selectedPlayer}
            enhancedVOR={selectedPlayerVOR}
            onClose={this.handleCloseDetails}
            onDraft={this.handleDraft}
          />
        )}
      </div>
    );
  }
}

const mapStateToProps = (state: IStoreState) => {
  // Get all player keys that have been drafted
  const draftedKeys = new Set<string>();
  state.teams.forEach((team) => {
    const allPlayers = [
      ...team.QB,
      ...team.RB,
      ...team.WR,
      ...team.TE,
      ...team.FLEX,
      ...team.SUPERFLEX,
      ...team.DST,
      ...team.K,
      ...team.BENCH,
    ];
    allPlayers.forEach((p) => {
      if (p) draftedKeys.add(p.key);
    });
  });

  return {
    players: state.undraftedPlayers as IPlayerExtended[],
    draftedKeys,
    currentPick: state.currentPick,
    trackedTeam: state.trackedTeam,
    rosterFormat: state.rosterFormat,
    numberOfTeams: state.numberOfTeams,
  };
};

const mapDispatchToProps = (dispatch: any) => ({
  onPickPlayer: (player: IPlayerExtended) => dispatch(onPickPlayer(player)),
});

export default connect(mapStateToProps, mapDispatchToProps)(App);
