# QA checks for develop pull requests

Scope: automated tests, test isolation, CI configuration, and this document.
Application source, validation, API formats, database operations, styles, and the
trained model are outside this change. Work remains on `testing_final`.

## Existing coverage and initial findings

- Backend: prediction/model sanity checks, input validation, authentication and
  account operations, saved assessments/history, stress persistence, learning
  routes, and mocked MedlinePlus/MyHealthfinder services.
- Frontend: context providers, units, assessment/stress flows, dashboard helpers,
  charts, history, learning navigation, and external-content adapters.
- Initial frontend baseline: 203 passed, 6 failed, 209 tests in 28 files.
  Four history tests omitted RiskContext. The carousel test queried both desktop
  and tablet module copies; its assertion failure also left fake timers enabled.
- Initial frontend build: passed (747 modules).
- Initial lint: 10 errors and 3 warnings in production files. No lint rules have
  been weakened and no production refactors are included.
- The previous workflow lived in `.github/.workflows/`, outside GitHub's workflow
  discovery directory. It ran only backend/test_main.py and no frontend tests.
- The former test_supabase.py was a live-login diagnostic, with no test functions,
  and printed an access token during collection. It is replaced by mocked tests
  for user-scoped client construction and token-specific caching.

## Local commands

Use Node 22 (at least 22.12) and Python 3.12. From the repository root:

```sh
cd frontend
npm ci
npm test
npm run build
npm run lint
```

In a separate shell, from the repository root and an activated Python environment:

```sh
cd backend
python -m pip install -r requirements.txt -c constraints-test.txt
python -m pytest -q
```

Tests must not require a running backend, Supabase account, real password, or
production secret. Pytest supplies dummy credentials before application imports
and disables dotenv loading in its process. External socket connections during
tests fail; loopback is permitted for Windows event-loop internals. External
service tests use fakes or httpx.MockTransport. No model is retrained.

Vitest uses a separate configuration with dotenv files disabled and dummy
VITE_API_URL/Supabase values. A default fetch mock rejects unexpected requests;
tests explicitly supply their own service fakes. Cleanup restores globals, spies,
and real timers. Two workers bound React/jsdom resource usage. Vite's production
configuration is unchanged.

## Verification results

- Full frontend regression: **231 passed in 29 files**, 0 failures (129.52 seconds).
  The 209 existing cases remain; 22 new API-adapter cases cover prediction output,
  authentication headers, request methods/bodies, history and stress operations,
  HTTP 401/409/422/500, malformed error responses, and transport failure.
- JUnit output was generated and parsed: 231 tests, 0 failures, 0 errors.
- First full backend run: **134 passed**, 2 warnings (46.12 seconds). One warning
  identified the saved SimpleImputer as scikit-learn 1.9.0 while the unconstrained
  test install selected 1.9.1. The test-only constraints file now matches 1.9.0;
  production requirements and the saved artifact are unchanged.
- Final backend run with the training-version constraint: **134 passed**,
  **1 warning** (15.92 seconds). The remaining warning is Starlette's deprecation
  notice about httpx in TestClient; it is not suppressed. The model-version
  warning is gone. Backend JUnit output was generated and parsed successfully.
- ESLint on all added/modified frontend test/configuration files: passed.
- Frontend production build: passed before edits; production build inputs were
  not modified by this work.
- Python syntax and workflow YAML/structure checks: passed. This is not a full
  GitHub runner/actionlint validation.
- git diff --check and an allowlist audit of every changed/untracked repository
  file: passed. Only the planned QA files changed; no production source or model
  artifact changed. At the initial verification, no commits, pushes, deployment,
  or branch-rule changes had been performed. Subsequent QA commits are recorded
  in the branch history; publishing and repository settings remain separate steps.
- Full-project lint retains the baseline 10 errors and 3 warnings. Existing
  AuthProvider tests also emit React act() warnings; no warning suppression was
  introduced.

Local frontend verification used Node 22.14.0. Python testing uses an isolated
Python 3.12 environment with interpret-core (the package providing interpret's
model implementation); CI installs the unchanged backend/requirements.txt with
the test-only constraints, including the full interpret distribution and its
optional tooling.

## CI and merge checks

The workflow runs on pull requests targeting `develop`, pushes to `develop`,
`feature/**` and `testing_final*`, and manual dispatch. Backend and frontend jobs
run independently. Failures fail their job; test results upload as JUnit artifacts
even when a test fails. The frontend uses npm ci and its existing lockfile.

The TestClient suite imports the actual FastAPI app and exercises its routes;
there is no background server, fixed sleep, or live Supabase startup dependency.
The workflow has read-only repository permissions and no deployment credentials.

After the first successful GitHub run, a repository administrator should require
`Check Backend` and `Check Frontend` in the branch protection/ruleset for
`develop`, require a pull request and review, and prevent direct integration
pushes. These repository settings are not applied by a workflow file. The actual
GitHub runner result must be checked after pushing; local checks do not establish
that GitHub Actions has run.

Lint currently needs a separate production-code review: RiskProvider.jsx,
dashboard/components/RiskFactorPieChart.jsx, useDashboardViewModel.js, and
useEditAssessmentViewModel.js contain the reported violations. Fixing them could
affect render timing or component structure; this QA change does not alter them.
Lint is documented rather than silently disabled or added as a known-failing
required CI gate.

No deployment target or release approval policy is specified. This workflow
validates changes for integration and does not deploy the client application.

## Remaining release verification

- Browser/manual checks: responsive layouts, keyboard interactions, carousel
  transitions, Recharts rendering, what-if adjustments and reset, and mobile units.
- Dedicated non-production environment: real Supabase RLS between users, OAuth/MFA,
  email delivery, migrations, and account persistence. Mocked tests do not prove
  deployed database policies or third-party availability.
- Model checks establish existing output invariants, not clinical validity.
- Runtime Python requirements are currently unpinned. A repeatable dependency
  lock should be agreed against the team's deployment/training environment before
  changing production package versions or the serialized model.
  constraints-test.txt only fixes the observed scikit-learn training-version
  mismatch for QA; it is not a complete dependency lock.

Workflow reference: [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).
