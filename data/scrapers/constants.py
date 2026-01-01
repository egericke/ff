"""Team mappings and constants used across scrapers."""

import re

TEAM_ABBREVIATIONS = {
    "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
    "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
    "LAC", "LAR", "LV", "MIA", "MIN", "NE", "NO", "NYG",
    "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WSH"
}

TEAM_NAME_TO_ABBR = {
    "Cardinals": "ARI", "Arizona": "ARI",
    "Falcons": "ATL", "Atlanta": "ATL",
    "Ravens": "BAL", "Baltimore": "BAL",
    "Bills": "BUF", "Buffalo": "BUF",
    "Panthers": "CAR", "Carolina": "CAR",
    "Bears": "CHI", "Chicago": "CHI",
    "Bengals": "CIN", "Cincinnati": "CIN",
    "Browns": "CLE", "Cleveland": "CLE",
    "Cowboys": "DAL", "Dallas": "DAL",
    "Broncos": "DEN", "Denver": "DEN",
    "Lions": "DET", "Detroit": "DET",
    "Packers": "GB", "Green Bay": "GB",
    "Texans": "HOU", "Houston": "HOU",
    "Colts": "IND", "Indianapolis": "IND",
    "Jaguars": "JAX", "Jacksonville": "JAX",
    "Chiefs": "KC", "Kansas City": "KC",
    "Chargers": "LAC", "L.A. Chargers": "LAC", "Los Angeles Chargers": "LAC",
    "Rams": "LAR", "L.A. Rams": "LAR", "Los Angeles Rams": "LAR",
    "Raiders": "LV", "Las Vegas": "LV",
    "Dolphins": "MIA", "Miami": "MIA",
    "Vikings": "MIN", "Minnesota": "MIN",
    "Patriots": "NE", "New England": "NE",
    "Saints": "NO", "New Orleans": "NO",
    "Giants": "NYG", "N.Y. Giants": "NYG", "New York Giants": "NYG",
    "Jets": "NYJ", "N.Y. Jets": "NYJ", "New York Jets": "NYJ",
    "Eagles": "PHI", "Philadelphia": "PHI",
    "Steelers": "PIT", "Pittsburgh": "PIT",
    "Seahawks": "SEA", "Seattle": "SEA",
    "49ers": "SF", "San Francisco": "SF",
    "Buccaneers": "TB", "Tampa Bay": "TB",
    "Titans": "TEN", "Tennessee": "TEN",
    "Commanders": "WSH", "Washington": "WSH",
}

LEGACY_TEAM_FIXES = {
    "WAS": "WSH",
    "JAC": "JAX",
    "LA": "LAR",
}

POSITIONS = {"QB", "RB", "WR", "TE", "K", "DST"}

POSITION_ALIASES = {
    "FB": "RB",
    "D/ST": "DST",
    "DEF": "DST",
}

def normalize_team(team: str) -> str:
    """Normalize team name/abbreviation to standard 2-3 letter code."""
    team = team.strip().upper()
    if team in TEAM_ABBREVIATIONS:
        return team
    if team in LEGACY_TEAM_FIXES:
        return LEGACY_TEAM_FIXES[team]
    for name, abbr in TEAM_NAME_TO_ABBR.items():
        if name.upper() == team:
            return abbr
    raise ValueError(f"Unknown team: {team}")

def normalize_position(pos: str) -> str:
    """Normalize position to standard code."""
    pos = pos.strip().upper()
    if pos in POSITIONS:
        return pos
    if pos in POSITION_ALIASES:
        return POSITION_ALIASES[pos]
    raise ValueError(f"Unknown position: {pos}")

def create_player_key(name: str, pos: str, team: str) -> str:
    """Create unique player key from name, position, and team."""
    clean_name = name.lower().replace("sr", "").replace("jr", "").replace(".", "").strip()
    clean_name = re.sub(r"[^a-z ]+", "", clean_name).strip()
    parts = clean_name.split()
    last_name = parts[-1] if parts else clean_name
    return f"{last_name}_{pos.lower()}_{team.lower()}"
