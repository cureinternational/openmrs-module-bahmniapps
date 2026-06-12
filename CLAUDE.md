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
