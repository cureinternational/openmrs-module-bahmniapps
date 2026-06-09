# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is **openmrs-module-bahmniapps**, a hybrid AngularJS + React EMR (Electronic Medical Records) frontend for the Bahmni/OpenMRS ecosystem. It is transitioning from a monolithic AngularJS SPA to React micro-frontends via Webpack Module Federation.

## Build Commands

### Prerequisites
- Node.js 14.x (`nvm use 14`)
- Ruby 3.1 (for Compass/SCSS compilation)
- Global tools: `npm install -g yarn grunt-cli && gem install compass`

### React Micro-frontends (`/micro-frontends/`)
```bash
yarn install
yarn build          # outputs to ../ui/app/micro-frontends-dist/
yarn test           # Jest tests
yarn test:ci        # Jest with coverage reports
```

### Main AngularJS App (`/ui/`)
```bash
yarn install
yarn bundle         # Grunt-based build (concat, minify)
yarn uglify-and-rename  # Final JS/CSS minification
yarn compass        # Compile SCSS → CSS

yarn test           # Karma + Jasmine (single run)
yarn test:watch     # Karma watch mode
yarn lint           # ESLint (AngularJS)
yarn lint:fix       # ESLint with auto-fix
```

### Full Build (as in CI)
```bash
# Micro-frontends first
cd micro-frontends && yarn install && yarn build && cd ..

# Main app (includes test run)
cd ui && yarn install && ./scripts/package.sh
# Output: ui/target/bahmniapps.zip
```

### Running a Single Karma Test File
Edit `ui/test/config/karma.conf.js` temporarily, or use pattern filtering with Grunt:
```bash
cd ui && grunt karma:unit --grep="your test description"
```

## Architecture

### Two-Layer Structure

```
openmrs-module-bahmniapps/
├── micro-frontends/     # React MFEs (Module Federation host)
│   └── src/
│       ├── shared/      # Carbon Design System, shared React components
│       ├── ipd/         # IPD remote MFE (In-Patient Department)
│       └── next-ui/     # Next-gen React components
└── ui/                  # Main AngularJS application
    ├── app/
    │   ├── common/      # Shared AngularJS modules (see below)
    │   ├── clinical/    # Clinical consultation
    │   ├── adt/         # Admission/Discharge/Transfer
    │   ├── registration/
    │   ├── admin/
    │   ├── orders/
    │   ├── ot/          # Operating Theater
    │   ├── reports/
    │   ├── home/
    │   ├── bedmanagement/
    │   ├── document-upload/
    │   └── micro-frontends-dist/  # Built React bundles (committed)
    └── test/
        ├── unit/        # Jasmine test files (*.spec.js)
        └── config/karma.conf.js
```

### AngularJS Module System

Each app (clinical, adt, registration, etc.) is a standalone AngularJS module with:
- `init.js` — module bootstrap/initialization
- `app.js` — AngularJS module definition and routes (UI Router)
- `constants.js` — module-specific constants
- Subdirectories for controllers, services, directives, views

Shared functionality lives in `ui/app/common/` as separate AngularJS modules:
- `bahmni.common.app-framework` — routing framework
- `bahmni.common.auth` — authentication
- `bahmni.common.services` — OpenMRS REST API services
- `bahmni.common.domain` — data models
- `bahmni.common.displaycontrols` — pluggable display components (key extension point)
- `bahmni.common.obs` — observation handling
- `bahmni.common.concept-set` — concept/form handling
- `bahmni.common.i18n` — internationalization (angular-translate)
- `bahmni.common.config` — configuration management

### React ↔ AngularJS Integration

- React micro-frontends are built via Webpack Module Federation (`micro-frontends/webpack.config.js`)
- `react2angular` library bridges React components into AngularJS apps
- Built bundles land in `ui/app/micro-frontends-dist/` and are loaded via `<script>` tags

### Display Controls Pattern

`bahmni.common.displaycontrols` is the key extension point for clinical views. Display controls are pluggable Angular directives that render patient data (observations, prescriptions, lab results, etc.) in consultation and patient summary pages.

## Key Technologies

| Layer | Technology |
|---|---|
| Main SPA | AngularJS 1.4.9, Angular UI Router, ngDialog |
| Micro-frontends | React 16, Webpack 5 Module Federation |
| UI Library (React) | IBM Carbon Design System |
| Build (AngularJS) | Grunt, Compass (SCSS) |
| Build (React) | Webpack 5, Babel 7 |
| Testing (AngularJS) | Karma 4, Jasmine, Firefox |
| Testing (React) | Jest 29, jsdom |
| Linting | ESLint (semistandard for AngularJS, prettier for React) |
| Date/Utility | Moment.js, Lodash 4 |
| Charts | D3.js, NVD3 |
| PDF | PDFMake, html2pdf.js |

## Code Coverage Thresholds (AngularJS)

CI enforces minimum coverage (configured in `ui/Gruntfile.js`):
- Statements: 70%, Branches: 59%, Functions: 62.5%, Lines: 70.05%

## Linting

- **AngularJS**: `eslint-config-semistandard` + `eslint-plugin-angular` — config at `ui/.eslintrc`
- **React**: `eslint:recommended` + `plugin:react/recommended` + prettier — config at `micro-frontends/.eslintrc.js`

## Variable Dose Protocol (VDP) Order Editing (Hive-115862)

### Feature Overview
Variable Dose Protocol allows prescribing drugs with multiple dosage stages (e.g., loading dose + tapering schedules). This feature enables editing VDP orders in two scenarios:

1. **Unsaved edits**: Modify pending VDP entries in the new-orders list
2. **Saved-order revisions**: Edit already-saved VDP orders from the history tab (sends REVISE action to backend)

### Architecture: AngularJS-React Integration

**Pattern**: Use `hostApi` object passed from AngularJS to React:
- AngularJS broadcasts event with drugOrder/entry data
- Controller calls `hostApi.openModal(initialValues, isSavedOrder, editMode)` to open React modal
- React modal pre-populates with converted data
- User saves → `hostApi.onSave(data)` callback back to AngularJS
- AngularJS stores/submits the entry

### Data Format Normalization

Three stage formats exist; conversion in `toVariableDoseModalInitialValues()`:

| Format | Structure | Source |
|--------|-----------|--------|
| Stored Entry | `{ duration: 5, durationUnit: 'Day(s)', ... }` | `consultation.variableDoseTreatments` |
| FHIR View-Model | `{ duration: '5 Day(s)', durationUnit: undefined, ... }` | Saved orders via `fhirDosageToStage` |
| Form Format | `{ duration: 5, durationUnit: { label: 'Day(s)', value: 'Day(s)' }, ... }` | Modal expects this |

**Conversion Logic**: `parseDuration()` normalizes both entry and FHIR formats to form format.

### Units and Route Extraction

Values can come from two nested sources (fallback chain):
1. **Nested**: `dosingInstructions.doseUnits/quantityUnits` and `dosingInstructions.route`
2. **Top-level**: `quantityUnit` and `route` (when dosingInstructions absent)

Extraction in:
- `fhirDosingUtils.js:toVariableDoseModalInitialValues()`
- `addTreatmentController.js` event:reviseVariableDoseOrder handler

### Key Implementation Details

**Drug field disable**: `disabled={isEditMode}` — prevents changing drug in both unsaved and saved edits

**Rate/Additives clearing**: When dosing rule is removed, clear both loading dose and stage rate/additives values

**Loading dose instructions**: Extracted to `loadingDoseInstructionsValue` variable; handles both object `{ label, value }` and string formats

**Modal scrolling**: `max-height: calc(84vh - 200px)` with `overflow-y: auto` ensures all stages visible even with 4+ stages

**Edit Disable Checks**: Edit button disabled when:
- Order not active (`!drugOrder.isActive()`)
- Not editable (`!drugOrder.isEditAllowed`)
- Medication added to Drug Chart (`disableEditButton()` checks `medicationSchedules`)

### Key Files

| File | Purpose |
|------|---------|
| `ui/app/clinical/consultation/controllers/addTreatmentController.js` | Orchestrates VDP creation/edit, broadcasts events, manages modal |
| `ui/app/clinical/consultation/controllers/drugOrderHistoryController.js` | Handles revision of saved VDP orders |
| `ui/app/clinical/common/models/fhirDosingUtils.js` | Converts between stage data formats, exports `toVariableDoseModalInitialValues` |
| `micro-frontends/src/next-ui/Components/VariableDoseProtocol/VariableDoseProtocolModal.jsx` | React modal: handles UI, state, form validation |
| `micro-frontends/src/next-ui/Containers/variableDoseProtocol/VariableDoseProtocol.jsx` | React container: manages modal state, AngularJS integration via `hostApi` |
| `ui/app/clinical/consultation/views/treatmentSections/drugOrderHistory.html` | History view: edit button with disable logic |

### Testing

- **Unit tests**: `ui/test/unit/clinical/common/models/fhirDosingUtils.spec.js` — stage format conversions
- **Component tests**: `micro-frontends/src/next-ui/Components/VariableDoseProtocol/VariableDoseProtocolModal.spec.jsx` — modal pre-population and edit mode

### Common Gotchas

1. **Duration format mismatch**: Saved orders use "5 Day(s)", unsaved use separate fields. Both normalized in `parseDuration()`.
2. **Units/route nested**: Backend sometimes nests in `dosingInstructions`, sometimes at root level. Always check both.
3. **Modal state cleanup**: `onClose()` must reset all state so next new order opens with clean form.
4. **Object mutation**: Setting `drugOrder.isBeingEdited = true` prevents duplicate buttons but mutates reference.
