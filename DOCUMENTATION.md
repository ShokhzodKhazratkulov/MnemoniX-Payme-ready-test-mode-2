# MnemoniX Project Documentation

## 1. Overview
MnemoniX is an AI-powered vocabulary learning platform that uses mnemonics to help users memorize words 10x faster. By combining linguistic analysis with visual storytelling, it bridges the gap between abstract words and long-term memory.

## 2. Core Features
- **AI Mnemonic Generator**: Uses Google Gemini and Vertex AI to create phonetic links, stories, and visual images for any word.
- **Interactive Flashcards**: A spaced-repetition system to practice and master vocabulary.
- **Community Feed**: A social platform where users share their best mnemonics.
- **Remix System**: Allows users to take an existing mnemonic and adapt it to their own learning style.
- **Multi-language Support**: Full localization for English, Uzbek, and Russian.
- **Personal Library**: Track progress, saved mnemonics, and personal creations.

## 3. Technical Stack
- **Frontend**: React 18+, Vite, TypeScript.
- **Styling**: Tailwind CSS, Lucide Icons, Framer Motion (animations).
- **Backend/Database**: Firebase Firestore (NoSQL).
- **Authentication**: Firebase Authentication (Google Login).
- **AI Engine**: Google GenAI SDK (@google/genai) using Gemini models for text and Vertex AI for image generation.

## 4. Architecture
- `/src/components`: Reusable UI components (MnemonicCard, Flashcards, etc.).
- `/src/constants`: Global constants and localization strings (`translations.ts`).
- `/src/services`: Logic for AI interactions and Firebase operations.
- `/src/types.ts`: Global TypeScript definitions.

## 5. Database Schema (Firestore)
- `users`: User profiles, settings, and subscription status.
- `mnemonics`: The core data for every word, story, and image.
- `categories`: Grouping of words by level (Beginner, Intermediate, Advanced) or topic.
- `posts`: Community-shared mnemonics.

## 6. Setup & Installation
1. Install dependencies: `npm install`
2. Configure Firebase: Add credentials to `firebase-applet-config.json`.
3. Run development server: `npm run dev`
4. Build for production: `npm run build`
