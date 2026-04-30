# MnemoniX Changelog & Improvement Log

## [2026-04-28] - Monetization (Full Implementation)
### Added
- **Usage Guarding**: Enforced 5-search daily limit and post restrictions for Freemium users.
- **Payme Backend**: Full-stack integration with Express handling JSON-RPC callbacks for automated fulfillment.
- **Device Locking**: Implemented unique device signature verification using Capacitor.
- **Subscription UI**: Added pricing plans and Payme checkout flow in Profile view.

## [2026-04-28] - Monetization (Infrastructure)
### Added
- **Monetization Infrastructure**: Defined types for subscription tiers, usage limits, and device locking.
- **Payme Integration Plan**: Outlined step-by-step approach for Payme Merchant API implementation.
- **Database Schema**: Proposed SQL migrations for trial tracking and daily usage limits.

## [2026-03-31] - Translation & Linter Fixes
### Fixed
- **Duplicate Translation Keys**: Removed multiple duplicate property names in `src/constants/translations.ts` across English, Uzbek, and Russian blocks (TS1117).
- **Prop Drilling**: Fixed missing `t` prop in `MnemonicCard` when rendered from `App.tsx` and `Flashcards.tsx` (TS2741).
- **Flashcards Localization**: Updated `Flashcards.tsx` to correctly handle full translation context (`fullT`) for top-level UI elements like "Shuffle" and "Mark Mastered".

### Improved
- **Linter Compliance**: Ran `tsc --noEmit` to ensure codebase is free of type errors.
- **Build Stability**: Verified successful production build using `npm run build`.

## [2026-03-31] - Initial AI Integration
### Added
- **Gemini 3.1 Integration**: Implemented text generation for mnemonic stories using `@google/genai`.
- **Vertex AI Image Generation**: Integrated image generation to visualize mnemonic stories.
- **Multi-language Support**: Added initial translation infrastructure for EN, UZ, and RU.

## [2026-03-30] - Core Infrastructure
### Added
- **Firebase Setup**: Configured Firestore and Authentication.
- **Base UI Components**: Created `MnemonicCard`, `Flashcards`, and `SearchPage`.
- **Navigation**: Implemented view-based routing in `App.tsx`.
