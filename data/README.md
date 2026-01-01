# Fantasy Football Data Pipeline

Modular data scraping and processing system for fantasy football projections.

## Structure

```
data/
├── scrapers/           # Source-specific scrapers
│   ├── base.py         # Base scraper class
│   ├── constants.py    # Team/position normalization
│   ├── espn.py         # ESPN projections
│   ├── cbs.py          # CBS projections
│   ├── nfl.py          # NFL.com projections
│   └── fantasypros.py  # FantasyPros ADP
├── processors/         # Data processing
│   ├── aggregator.py   # Multi-source aggregation
│   ├── risk_calculator.py    # Injury/consistency scoring
│   └── schedule_analyzer.py  # SOS calculations
├── validators/         # Data quality checks
│   └── data_quality.py
├── pipeline.py         # Pipeline orchestration
└── main.py             # Entry point
```

## Usage

```bash
# Run full pipeline
python main.py

# Run tests
pytest tests/ -v
```

## Output

Produces `processed/Projections-{YEAR}.json` with:
- Player projections (weighted average from multiple sources)
- ADP rankings (standard, half-PPR, PPR)
- Risk profiles (injury score, consistency, floor/ceiling)
- Schedule analysis (SOS overall, playoffs)
