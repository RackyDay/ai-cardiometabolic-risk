# Assessment modules

`assessmentModules.js` defines the hub's modules. Add an entry with a unique `id`,
`title`, `category`, `description`, `Icon`, `topics`, `required`, `to`, `footer`,
and `getInputs(context)`. Register the destination route in `App.jsx`.
Optional `actionLabel` and `completedActionLabel` override the card's button text.
`editTo` optionally sets a separate edit route (defaults to `to`). The Edit inputs
control is disabled until the module is complete.

`AssessmentModuleCard` in `components/common` owns the shared layout and badges.
It receives a `complete` boolean and has no dependency on assessment state.

After a module successfully saves validated inputs, call `completeModule(id, inputs)` from
`RiskContext`. Inputs must be a flat object of primitive field values.
Completion compares the current inputs with that saved snapshot, so changed
answers are incomplete until saved again. Failed validation does not complete
a module. Completion is session-only and is cleared on account changes and by
`startNewAssessment()`, called by the Get started and Add Assessment buttons.
Existing saved results are not used as completion for a new assessment.

Required modules must have saved inputs before Calculate risk score is enabled.
Saving base risk inputs returns to the modules page without calling the API.
Calculate risk score calls the prediction API and opens the dashboard on success;
failures remain on the modules page with a retryable error.
