"""
Enhance existing projections with risk and schedule data for Advanced VOR.

This script adds realistic risk profiles and schedule scores to the existing
projections.json file so the Advanced VOR dashboard can display meaningful data.

Usage:
    python enhance_projections.py
"""

import json
import random
import os
from typing import Any

# Seed for reproducibility
random.seed(42)

# Position-based risk profiles (injury tendencies)
POSITION_INJURY_BASE = {
    "QB": 25,   # QBs less injury prone
    "RB": 55,   # RBs most injury prone
    "WR": 40,   # WRs moderate
    "TE": 45,   # TEs moderate-high
    "K": 10,    # Kickers rarely injured
    "DST": 5,   # Team defenses N/A
}

# Player-specific injury adjustments (known injury-prone players)
INJURY_PRONE_PLAYERS = {
    "saquon_RB_PHI": 20,
    "mccaffrey_RB_SF": 25,
    "cook_RB_DAL": 20,
    "henry_RB_BAL": 15,
    "kamara_RB_NO": 15,
    "watson_QB_CLE": 30,
    "dak_QB_DAL": 20,
    "burrow_QB_CIN": 20,
    "godwin_WR_TB": 20,
    "pitts_TE_ATL": 15,
}

# Team schedule strength (0-100, higher = harder schedule)
TEAM_SOS = {
    "ARI": 55, "ATL": 48, "BAL": 42, "BUF": 58, "CAR": 62, "CHI": 52,
    "CIN": 50, "CLE": 55, "DAL": 45, "DEN": 60, "DET": 38, "GB": 52,
    "HOU": 48, "IND": 50, "JAX": 58, "KC": 40, "LAC": 55, "LAR": 52,
    "LV": 58, "MIA": 45, "MIN": 48, "NE": 62, "NO": 55, "NYG": 60,
    "NYJ": 58, "PHI": 42, "PIT": 52, "SF": 45, "SEA": 55, "TB": 50,
    "TEN": 52, "WAS": 55,
}

# Playoff schedule (weeks 14-17) strength modifiers
PLAYOFF_SOS_MODIFIER = {
    "ARI": 5, "ATL": -5, "BAL": -8, "BUF": 3, "CAR": 8, "CHI": 2,
    "CIN": -3, "CLE": 5, "DAL": -5, "DEN": 8, "DET": -10, "GB": 0,
    "HOU": -8, "IND": 3, "JAX": 5, "KC": -5, "LAC": 3, "LAR": -2,
    "LV": 5, "MIA": -3, "MIN": 0, "NE": 10, "NO": 3, "NYG": 5,
    "NYJ": 3, "PHI": -8, "PIT": 2, "SF": -5, "SEA": 5, "TB": -3,
    "TEN": 0, "WAS": 3,
}


def calculate_injury_score(player: dict) -> float:
    """Calculate injury score (0-100, higher = more risky)."""
    pos = player.get("pos", "")
    key = player.get("key", "")

    # Base score by position
    base = POSITION_INJURY_BASE.get(pos, 30)

    # Add player-specific adjustment
    adjustment = INJURY_PRONE_PLAYERS.get(key, 0)

    # Add some randomness (-10 to +10)
    noise = random.gauss(0, 5)

    score = base + adjustment + noise
    return max(0, min(100, score))


def calculate_consistency_score(player: dict) -> float:
    """Calculate consistency score (0-1, higher = more consistent)."""
    pos = player.get("pos", "")
    rank = player.get("ppr", 999)

    # Elite players more consistent
    if rank <= 12:
        base = 0.85
    elif rank <= 36:
        base = 0.70
    elif rank <= 72:
        base = 0.55
    elif rank <= 150:
        base = 0.40
    else:
        base = 0.30

    # Position adjustments (QBs more consistent, RBs less)
    pos_adj = {"QB": 0.10, "RB": -0.05, "WR": 0.0, "TE": -0.05, "K": 0.15, "DST": 0.0}

    score = base + pos_adj.get(pos, 0) + random.gauss(0, 0.05)
    return max(0.1, min(0.95, score))


def calculate_floor_ceiling(player: dict, consistency: float) -> tuple[float, float]:
    """Calculate floor and ceiling projections."""
    # Use PPR projection as base
    base_pts = 0.0
    pos = player.get("pos", "")

    # Calculate projected points based on position
    if pos == "QB":
        pass_yds = player.get("passYds", 0) or 0
        pass_tds = player.get("passTds", 0) or 0
        rush_yds = player.get("rushYds", 0) or 0
        rush_tds = player.get("rushTds", 0) or 0
        ints = player.get("passInts", 0) or 0
        base_pts = (pass_yds * 0.04) + (pass_tds * 4) + (rush_yds * 0.1) + (rush_tds * 6) - (ints * 2)
    elif pos == "RB":
        rush_yds = player.get("rushYds", 0) or 0
        rush_tds = player.get("rushTds", 0) or 0
        rec = player.get("receptions", 0) or 0
        rec_yds = player.get("receptionYds", 0) or 0
        rec_tds = player.get("receptionTds", 0) or 0
        base_pts = (rush_yds * 0.1) + (rush_tds * 6) + rec + (rec_yds * 0.1) + (rec_tds * 6)
    elif pos == "WR":
        rec = player.get("receptions", 0) or 0
        rec_yds = player.get("receptionYds", 0) or 0
        rec_tds = player.get("receptionTds", 0) or 0
        rush_yds = player.get("rushYds", 0) or 0
        base_pts = rec + (rec_yds * 0.1) + (rec_tds * 6) + (rush_yds * 0.1)
    elif pos == "TE":
        rec = player.get("receptions", 0) or 0
        rec_yds = player.get("receptionYds", 0) or 0
        rec_tds = player.get("receptionTds", 0) or 0
        base_pts = rec + (rec_yds * 0.1) + (rec_tds * 6)
    elif pos == "K":
        base_pts = 120  # Average kicker
    elif pos == "DST":
        base_pts = 100  # Average DST

    if base_pts == 0:
        base_pts = 50  # Fallback

    # Floor/ceiling based on consistency
    # High consistency = narrow range, low consistency = wide range
    variance = (1 - consistency) * 0.5  # 0-50% variance

    floor = base_pts * (1 - variance)
    ceiling = base_pts * (1 + variance * 1.5)  # Ceiling can be higher

    return floor, ceiling


def calculate_schedule_score(player: dict) -> float:
    """Calculate schedule adjustment (-10 to +10 VOR points)."""
    team = player.get("team", "")
    pos = player.get("pos", "")

    if pos in ["K", "DST"]:
        return 0  # No schedule adjustment for K/DST

    sos = TEAM_SOS.get(team, 50)
    playoff_mod = PLAYOFF_SOS_MODIFIER.get(team, 0)

    # Convert to VOR adjustment
    # 50 = neutral, <50 = easier (positive), >50 = harder (negative)
    base_adj = (50 - sos) / 10  # -5 to +5 range
    playoff_adj = (0 - playoff_mod) / 5  # Additional -2 to +2

    total = base_adj + playoff_adj + random.gauss(0, 1)
    return max(-10, min(10, total))


def enhance_player(player: dict) -> dict:
    """Add risk and schedule data to a player."""
    enhanced = player.copy()

    # Calculate risk profile
    injury_score = calculate_injury_score(player)
    consistency = calculate_consistency_score(player)
    floor, ceiling = calculate_floor_ceiling(player, consistency)

    # Calculate weekly variance from consistency (higher consistency = lower variance)
    weekly_variance = (1 - consistency) * 15  # 0-15 point variance

    # Add risk data
    enhanced["risk"] = {
        "riskProfile": {
            "injuryScore": round(injury_score, 1),
            "consistencyScore": round(consistency, 3),
            "floor": round(floor, 1),
            "ceiling": round(ceiling, 1),
            "weeklyVariance": round(weekly_variance, 2),
        }
    }

    # Calculate schedule score
    schedule_score = calculate_schedule_score(player)
    enhanced["scheduleScore"] = round(schedule_score, 2)

    # Add some advanced stats (simulated)
    pos = player.get("pos", "")
    if pos in ["WR", "TE"]:
        rank = player.get("ppr", 999)
        if rank <= 12:
            target_share = random.uniform(0.22, 0.30)
        elif rank <= 36:
            target_share = random.uniform(0.15, 0.22)
        else:
            target_share = random.uniform(0.08, 0.15)

        enhanced["advanced"] = {
            "targetShare": round(target_share, 3),
            "snapPct": round(random.uniform(0.70, 0.95), 3),
            "redZoneTargets": random.randint(5, 25),
            "airYards": random.randint(500, 1500),
        }
    elif pos == "RB":
        enhanced["advanced"] = {
            "snapPct": round(random.uniform(0.40, 0.80), 3),
            "targetShare": round(random.uniform(0.05, 0.15), 3),
            "touchesInsideFive": random.randint(5, 30),
            "goalLineCarries": random.randint(3, 20),
        }
    elif pos == "QB":
        enhanced["advanced"] = {
            "avgDepthOfTarget": round(random.uniform(7.0, 12.0), 1),
            "pressureRate": round(random.uniform(0.20, 0.35), 3),
            "redZoneAttempts": random.randint(30, 80),
        }

    return enhanced


def main():
    """Main entry point."""
    # Find the projections file
    script_dir = os.path.dirname(__file__)
    app_public = os.path.join(script_dir, "..", "app", "public")
    input_path = os.path.join(app_public, "projections.json")
    output_path = os.path.join(app_public, "projections.json")

    # Also create backup
    backup_path = os.path.join(app_public, "projections.backup.json")

    print(f"Reading from: {input_path}")

    with open(input_path, "r") as f:
        data = json.load(f)

    # Create backup
    with open(backup_path, "w") as f:
        json.dump(data, f)
    print(f"Backup created: {backup_path}")

    # Enhance each player
    enhanced_data = []
    for player in data["data"]:
        enhanced = enhance_player(player)
        enhanced_data.append(enhanced)

    # Update schema to include new fields
    schema = data.get("schema", {})
    schema["fields"] = schema.get("fields", [])

    # Add new fields to schema
    new_fields = [
        {"name": "risk", "type": "object"},
        {"name": "scheduleScore", "type": "number"},
        {"name": "advanced", "type": "object"},
    ]
    for field in new_fields:
        if field["name"] not in [f["name"] for f in schema["fields"]]:
            schema["fields"].append(field)

    output_data = {
        "schema": schema,
        "data": enhanced_data,
    }

    # Write enhanced data
    with open(output_path, "w") as f:
        json.dump(output_data, f, indent=None, separators=(",", ":"))

    print(f"Enhanced {len(enhanced_data)} players")
    print(f"Output written to: {output_path}")

    # Show sample
    sample = enhanced_data[0]
    print("\nSample enhanced player:")
    print(f"  Name: {sample['name']}")
    print(f"  Position: {sample['pos']}")
    print(f"  Risk Profile: {sample.get('risk', {}).get('riskProfile', {})}")
    print(f"  Schedule Score: {sample.get('scheduleScore', 0)}")
    print(f"  Advanced: {sample.get('advanced', {})}")


if __name__ == "__main__":
    main()
