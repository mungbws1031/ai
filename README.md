# lfa_ai_lab

A beginner-friendly Python project for evaluating design concepts for a dip-based urine test stick that meters sample and transfers it to an LFA strip or pad.

## What this project does

- Loads project settings and scoring weights from `data/project_config.json`
- Loads concept candidates from `data/sample_concepts.json`
- Scores each concept (1 to 5) across 6 criteria:
  - `metering_accuracy`
  - `moldability`
  - `bubble_robustness`
  - `carry_stability`
  - `transfer_quality`
  - `ux_clarity`
- Applies configurable **weighted scoring**
- Adds **key risks** and a **recommendation** (`prototype`, `explore`, `discard`)
- Ranks concepts and writes a structured markdown report to `outputs/final_report.md`
- Optionally calls an LLM API to generate additional concept ideas text

## Practical scope

This tool is for **early-stage concept evaluation**.
It uses practical, heuristic scoring to compare options quickly.
It does **not** prove physical performance or replace lab validation/testing.

## Folder structure

```text
lfa_ai_lab/
├── .env.example
├── agents/
│   ├── concept_generator.py
│   ├── documenter.py
│   ├── evaluator.py
│   ├── llm_generator.py
│   └── researcher.py
├── data/
│   ├── project_config.json
│   └── sample_concepts.json
├── outputs/
│   ├── .gitkeep
│   └── example_final_report.md
├── main.py
├── README.md
└── requirements.txt
```

## How to install

1. Use Python 3.9+.
2. (Optional) Create a virtual environment.
3. Install dependencies:

```bash
pip install -r requirements.txt
```

## Run without API usage (default local workflow)

From the project root:

```bash
python main.py
```

This generates:

- `outputs/final_report.md`

## Run with optional API usage

1. Copy `.env.example` to `.env` and fill values.
2. Export variables into your shell (example):

```bash
export LLM_API_KEY="your_api_key_here"
export LLM_API_URL="https://api.your-llm-provider.com/v1/generate"
export LLM_MODEL="your-model-name"
```

3. Run:

```bash
python main.py --use-llm
```

If credentials are valid, this also writes:

- `outputs/llm_generated_ideas.md`

If credentials are missing, local scoring still works and the script prints a friendly message.

## LLM prompt goal

The optional LLM call asks for concept ideas under these constraints:

- 120 uL target
- flat plastic stick
- thickness around 5.5 mm max
- width around 17.89 mm
- dip sampling
- stable carry behavior
- stable transfer to strip or pad
- user experience is important

## Vendor customization notes

`agents/llm_generator.py` is intentionally vendor-neutral.
You should customize:

- API URL
- request payload shape
- auth/header format
- response parsing logic

This isolation keeps the rest of the project simple and local-first.

## How to edit concepts

Edit `data/sample_concepts.json`.

Each concept should include:

- `name`
- `summary`
- `mechanism`
- `assumed_retained_volume_ul`
- `overflow_strategy`
- `vent_strategy`
- `transfer_interface`
- `likely_failure_modes` (list)
- `manufacturability_notes` (list)
- `prototype_tests` (list)
- `scores` (all six criteria with values from 1 to 5)

## How to edit scoring weights

Edit `criteria_weights` in `data/project_config.json`.

Higher weight = more influence on total score.

## Recommendation logic

Recommendation thresholds are also in `data/project_config.json` so non-programmers can adjust them:

```json
"recommendation_thresholds": {
  "prototype_min": 29.0,
  "explore_min": 24.0
}
```

By default:

- `prototype` if weighted score >= `prototype_min`
- `explore` if weighted score >= `explore_min` and < `prototype_min`
- `discard` if weighted score < `explore_min`

