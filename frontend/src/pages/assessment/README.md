# Assessment modules

`assessmentModules.js` defines the hub's modules. Add an entry with a unique `id`,
`title`, `category`, `description`, `Icon`, `topics`, `required`, `to`, `footer`,
and `getInputs(context)`. Register the destination route in `App.jsx`.
Optional `actionLabel` and `completedActionLabel` override the card's button text.
`editTo` optionally sets a separate edit route (defaults to `to`). The Edit inputs
control is disabled until the module is complete.

`AssessmentModuleCard` in `components/common` owns the shared layout and badges.
It receives a `complete` boolean and has no dependency on assessment state.

After a module successfully submits, call `completeModule(id, inputs)` from
`RiskContext`. Inputs must be a flat object of primitive field values.
Completion compares the current inputs with that submitted snapshot, so changed
answers are incomplete until submitted again. Failed submissions do not complete
a module. Completion is session-only and is cleared on account changes and by
`startNewAssessment()`, called by the Get started and Add Assessment buttons.
Existing saved results are not used as completion for a new assessment.

The required badge is descriptive; it does not add a new submission gate.
Base risk submission still calculates and navigates directly to the dashboard.
