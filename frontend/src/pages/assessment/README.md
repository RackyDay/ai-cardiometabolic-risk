# Assessment modules

`assessmentModules.js` defines the hub's modules. Add an entry with a unique `id`,
`title`, `category`, `description`, `Icon`, `topics`, `required`, `to`, `footer`,
and `getInputs(context)`. Register the destination route in `App.jsx`.
Optional `actionLabel` and `completedActionLabel` override the card's button text.
`editTo` optionally sets a separate edit route (defaults to `to`). The Edit inputs
control is disabled until the module is complete.

Set `comingSoon: true` for a placeholder module without a form route. Its card
shows a disabled Coming soon action and no completion badge or edit control.
Stress Levels is an optional placeholder for the Perceived Stress Scale (PSS)
test and does not block risk calculation.

The hub displays one module at a time in an arrow-controlled carousel, ending
with a More modules coming soon placeholder. Inactive cards are hidden from
assistive technology and cannot receive keyboard focus. The arrows stop at
neither end: navigation loops continuously in both directions. Transitions
respect reduced-motion preferences.

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
