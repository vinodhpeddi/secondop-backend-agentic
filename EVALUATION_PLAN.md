# SecondOp AI Evaluation Plan (RAGAS + Safety Gates)

## Goal
Measure output quality and safety for case analysis before enabling wider production usage.

## Scope
- Backend pipeline outputs from:
  - baseline: `runCaseAnalysis`
  - agentic: `runAgenticCaseAnalysis`
- Artifacts under test:
  - summary
  - top specialist questions
  - observations (agentic)

## 1) Evaluation Dataset
Use a versioned JSONL dataset (`evaluation/cases.v1.jsonl`) with fields:
```json
{
  "case_id": "uuid-or-fixture-id",
  "intake": { "age": 0, "sex": "", "specialtyContext": "", "symptoms": "", "symptomDuration": "", "medicalHistory": "", "currentMedications": "", "allergies": "" },
  "documents": [{ "file_name": "report.pdf", "text": "..." }],
  "reference_summary": "...",
  "reference_questions": ["q1", "q2", "q3"],
  "must_not_claim": ["diagnosis", "treatment order"],
  "required_disclaimer": "AI-generated support content; licensed clinician review required."
}
```

## 2) Metrics
Run RAGAS-style metrics offline in CI/staging:
- `faithfulness`: output grounded in provided document text.
- `answer_relevancy`: summary/questions relevant to intake + reports.
- `context_precision`: generated claims supported by retrieved context.
- `context_recall`: important report facts reflected in output.

Project-specific safety/contract metrics:
- `schema_valid_rate`: valid structured output shape.
- `disclaimer_rate`: required disclaimer present.
- `forbidden_claim_rate`: diagnosis/treatment-directive violations.
- `question_count_exact_rate`: exactly 3 specialist questions.
- `uncertainty_flag_rate`: uncertainty language present when confidence low or evidence sparse.

## 3) Thresholds (Release Gates)
- Dev baseline:
  - faithfulness >= 0.75
  - answer_relevancy >= 0.75
  - context_precision >= 0.70
  - forbidden_claim_rate = 0
- Staging gate:
  - faithfulness >= 0.82
  - answer_relevancy >= 0.82
  - context_precision >= 0.78
  - schema_valid_rate >= 0.99
  - disclaimer_rate = 1.00
  - forbidden_claim_rate = 0
  - question_count_exact_rate = 1.00
- Production promotion gate:
  - 2 consecutive staging runs pass all gates
  - no regression > 0.03 on any core metric

## 4) Execution Cadence
- Per PR touching `src/services/analysis.service.ts`, `src/agents/**`, or `src/agentic/**`:
  - run eval sample set (fast subset, ~20 cases)
- Nightly:
  - run full evaluation set
- Before changing `ANALYSIS_AGENTIC_MODE` from `shadow` to `direct`:
  - run full set + clinician spot-review sample

## 5) Runtime Monitoring
Log per run:
- case_id, run_id, model, mode
- output schema valid/invalid
- disclaimer present/absent
- question count
- critic score (agentic)

Alert if:
- forbidden claim detected
- schema validation fails
- repeated low-faithfulness trend over rolling 24h evals

## 6) Rollout Policy
- Keep `ANALYSIS_AGENTIC_MODE=shadow` until staging gate passes.
- Move to `direct` only after production promotion gate passes.
- On regression, revert to `shadow` and open incident review.

## 7) Implementation Notes
- RAGAS is evaluation-only; it does not replace safety controls.
- Keep deterministic contract checks in runtime:
  - strict JSON parsing/validation
  - explicit disclaimer check
  - forbidden-claim detector
- Store eval reports under `evaluation/reports/<date>.json`.

