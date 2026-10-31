# Smart Heart AI
###### A platform which collects user health data (e.g. age, BMI, lifestyle) and predicts their 10 year cardiovascular disease risk with an integrated AI model.

Full technical documentation (architecture, database schema, API reference, ML model, testing, CI/CD) lives in [`docs/TECHNICAL_DOCUMENTATION.md`](docs/TECHNICAL_DOCUMENTATION.md).

### Team members:<br>
Remy Didelis - remydidelis@gmail.com <br>
Joesiah Liu - tsunetoishida03@gmail.com <br>
Simran Rao - simranrao9703@gmail.com </br>
Ansh Kapoor - kapooransh1101@gmail.com</br>
Henryaldi Matio - henryalditio@gmail.com</br>

## Tech Stack

- **Frontend:** React 19 (Vite), React Router, Recharts, Vitest + React Testing Library
- **Backend:** FastAPI (Python), Pydantic, Uvicorn
- **ML model:** Explainable Boosting Machine (InterpretML) trained on the Framingham Heart Study dataset
- **Database / Auth:** Supabase (PostgreSQL + Auth, with Row Level Security)
- **CI:** GitHub Actions

## Project Structure

```
ai-cardiometabolic-risk/
├── backend/        # FastAPI app, risk model, Supabase integration, pytest tests
├── frontend/       # React + Vite single-page app, Vitest tests
├── supabase/       # Database migrations (schema, RLS policies, RPC functions)
├── docs/           # Technical documentation and feature notes
└── .github/.workflows/ci.yml   # CI pipeline (backend boot check + tests, frontend build)
```

## Local Development

### Prerequisites
- Node.js 18+ and npm
- Python 3.13
- A Supabase project (or the [Supabase CLI](https://supabase.com/docs/guides/local-development) if you want to run Postgres locally against the migrations in `supabase/migrations/`)

### 1. Clone and install dependencies
```bash
git clone https://github.com/RackyDay/ai-cardiometabolic-risk.git
cd ai-cardiometabolic-risk

npm install                      # root (installs `concurrently`)
cd frontend && npm install && cd ..
cd backend && pip install -r requirements.txt && cd ..
```

### 2. Configure environment variables

Create `backend/.env`:
```
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_KEY=<anon/public key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

Create `frontend/.env`:
```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon/public key>
VITE_API_URL=http://localhost:8000
```

Both files are gitignored — never commit real keys. Get the Supabase values from your project's **Settings → API** page.

### 3. Apply the database schema

If you're pointing at a fresh Supabase project, push the migrations in `supabase/migrations/` via the Supabase CLI:
```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### 4. Running the prototype

**Full Stack** <br>
run
```npm run dev``` from project root (ai-cardiometabolic-risk)

**Backend only**<br>
run
```uvicorn main:app --reload``` from backend folder

API docs available at `http://localhost:8000/docs`.

**Frontend only**<br>
run ```npm run dev``` from frontend folder

App available at `http://localhost:5173`.

### 5. Run tests

Backend (from `backend/`):
```bash
pytest
```

Frontend (from `frontend/`):
```bash
npm run test        # single run
npm run test:watch  # watch mode
```

### 6. Linting (frontend)
```bash
cd frontend && npm run lint
```

## Contributing

See [`docs/TECHNICAL_DOCUMENTATION.md`](docs/TECHNICAL_DOCUMENTATION.md) for the API reference, database schema, and architecture before making changes. Open a pull request against `develop`; the CI pipeline must pass (backend boots and its tests pass, frontend builds) before merging.

## Known Issues / Next Steps

Carried over from the final client review meeting:

- **Input form only supports "Save inputs," not immediate calculation.** `frontend/src/pages/input/InputPage.jsx`'s only submit action is `handleSave`; there's no button that saves and immediately runs `/predict` in one step.
- **Blood pressure medication isn't flagged when BP is high and the user isn't on medication.** `bpMeds` (`backend/schemas.py`, `backend/risk_model.py`, `frontend/src/pages/input/riskInputTransform.js`) is just one more form field today, with no cross-check against the entered BP value or UI warning.
- **Dashboard risk-score disclaimer doesn't close on outside click.** The Input page's disclaimer modal already does this (backdrop click handler in `InputPage.jsx`). The Dashboard's risk-score disclaimer (`frontend/src/pages/dashboard/DashboardPage.jsx`, `disclaimer-trigger`/`disclaimer-panel`) is a toggle button with no backdrop — needs the same pattern.
- **Risk score zone labels require a click to reveal, instead of being shown statically beside the gauge.** See `selectedZone` state in `frontend/src/pages/dashboard/components/RiskGauge.jsx`.
- **"Back to dashboard" link is low-visibility.** Currently a plain text link in `frontend/src/pages/assessment/AssessmentPage.jsx` — needs a proper button treatment.
- **Model and training data need improvement.** The current model is an Explainable Boosting Machine (`interpret`) trained once, offline, on the classic Framingham Heart Study CSV (`backend/framingham.csv`) via `backend/train_model.py`. A larger/more diverse dataset and a re-evaluation of model choice is the suggested next step.
