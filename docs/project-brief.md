# Project Overview: Metal Music Discovery Web App
Act as a senior full-stack web developer. I want to build a frontend web application for discovering metal music subgenres and bands. The site focuses on visual exploration, using a master-detail card interface and a daily retention hook. 

Please build this using React (Next.js preferred), Tailwind CSS for styling, and Framer Motion for smooth card expansion animations.

## Core Features to Implement

### 1. The Subgenre Grid (Homepage)
*   **Layout:** A responsive grid displaying different metal subgenres (e.g., Death Metal, Black Metal, Power Metal, Doom Metal).
*   **Interaction:** Clicking a subgenre tile transitions the user to the Subgenre Dashboard.

### 2. Subgenre Dashboard
*   **Band of the Day:** A prominent hero component at the top showing one featured band. It should include a background image, the band's logo, 3 "vibe" tags (e.g., "Fast", "Guttural", "Gore"), and a placeholder for an embedded audio player.
*   **Band Roster Grid:** Below the hero, display a grid of Band Cards belonging to this subgenre. 
*   **Card State (Collapsed):** Each card shows the band's logo, a background photo, origin country, and active years.

### 3. Expanded Band Profile (Modal/Overlay)
*   **Interaction:** When a user clicks a collapsed Band Card, it should animate and expand into a modal overlay (or a dedicated detail view).
*   **Content Required in Modal:**
    *   **Hero Header:** Band photo with logo overlay.
    *   **Vibe Tags:** 3-4 descriptive tags.
    *   **Lineup Timeline:** Two side-by-side lists showing "Original Lineup" vs. "Current Lineup".
    *   **Discography Carousel:** A horizontal scrollable list of album covers and release years.
    *   **Top Tracks:** A section reserved for a Spotify/YouTube embed iframe.
    *   **Similar Bands:** 3 mini-cards linking to related bands.

## Design System & Aesthetics
*   **Theme:** Strict Dark Mode. Backgrounds should be deep blacks and dark grays (`bg-gray-900`, `bg-black`). 
*   **Typography:** Clean sans-serif for UI elements, but leave placeholders for custom display fonts for the subgenre titles to give it a "metal" aesthetic.
*   **Accents:** Use blood red, deep purple, or steel gray for interactive hover states and borders.
*   **Animations:** Use smooth, snappy scale-up animations when hovering over cards, and a seamless layout projection when expanding a card into the modal.

## Step-by-Step Execution Plan

**Phase 1: Mock Data Initialization**
Create a `data.json` or `mockData.ts` file. Define a robust schema containing an array of at least 3 subgenres. Inside each subgenre, include an array of at least 3 bands. Each band object must contain: `id`, `name`, `logoUrl`, `photoUrl`, `country`, `activeYears`, `vibeTags` (array of strings), `originalLineup` (array of strings), `currentLineup` (array of strings), and `albums` (array of objects with `title`, `year`, `coverUrl`).

**Phase 2: Component Scaffolding**
Build the base UI components: `SubgenreCard`, `BandCard`, and `HeroBandOfTheDay`. Do not worry about interactivity yet, just get the Tailwind layouts looking pixel-perfect with the mock data.

**Phase 3: Interactivity & State Management**
Implement the routing or state required to navigate from the Homepage Grid -> Subgenre Dashboard. Implement the modal state for the Expanded Band Profile.

**Phase 4: Animation & Polish**
Integrate Framer Motion (or standard CSS transitions) to handle the card expansion smoothly. Ensure the grid is fully responsive on mobile screens (1 column on mobile, 2 on tablet, 4 on desktop).

Please acknowledge these instructions. If you are ready, output the mock data schema first so we can agree on the data structure before you begin building the UI.