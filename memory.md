# Project Context: Bill Kockritz Memorial Website

**To Future AI Assistants:** This document contains the foundational context, technical architecture, and specific design directives for the Bill Kockritz Memorial website. Use this as your primary reference before suggesting code modifications or structural changes.

## 1. Project Overview & "The Why"
*   **Purpose:** A digital memorial and presentation tool for Bill Kockritz. It serves two distinct purposes: a timed, highly curated slideshow for a live memorial service, and a comprehensive, searchable family archive for loved ones to browse at home.
*   **The "Why" behind the tech stack:** The site is built entirely in **Vanilla HTML, CSS, and JavaScript**. It has no backend, no database, and no server-side processing. 
    *   *Why?* To ensure the site remains 100% free, permanent, and impervious to software rot. It is hosted on GitHub Pages (`kodertuck.github.io/BillKockritzMemorial/`). By keeping it static, the family truly "owns" it forever.
*   **Protection against spam:** There are no open web-upload forms. All media must be committed to the GitHub repository and logged in `media-data.js`. This was a deliberate choice to prevent internet trolls or bots from defacing the memorial.

## 2. Design & Thematic Directives
*   **Tone:** Warm, reverent, minimal, yet infused with Bill's "good-natured goofiness." 
*   **Aesthetics:** 
    *   Warm cream/linen aesthetic with subtle amber/gold accents.
    *   Clean typography using `Cinzel` (Serif/Headers) and `Plus Jakarta Sans` (Sans-serif/Body).
*   **Unique UI Elements (Do Not Remove):**
    *   **"Billisms" Button:** A feature that pops up lighthearted quips and goofy wisdom ("Always check the firewood twice, wear the funny sombrero...").
    *   **Climactic Finale Slide (`Pic-FinalMessage.png`):** This is a hard requirement. Every presentation sequence *must* end with this specific slide. It features Bill's life goal: *“My life’s goal is to get to the end and hear Jesus say, ‘Well done, good and faithful servant!’”*

## 3. Technical Architecture & File Structure
The project was migrated from a single-file prototype to a modular structure to prevent coding errors when updating a massive file. Do not merge these back into a single file.

```text
BillKockritzMemorial/
├── index.html              # Main presentation stage (UI for all modes)
├── admin.html              # Curator Admin dashboard (drag & drop playlist building)
├── style.css               # Global stylesheet (theater stage, lightboxes, UI)
├── media-data.js           # Service playlist and master media registry
├── media/                  # Directory containing all local .jpg, .png, and .mp4 files
└── js/
    ├── config.js           # Shared utilities, default pacing, quotes
    ├── audio-manager.js    # YouTube/Spotify integration & Audio Ducking logic
    ├── archive.js          # Searchable gallery grid logic
    ├── app.js              # Main slideshow engine, timers, DOM updates
    └── admin.js            # Curator drag-and-drop & browser storage logic
```

## 4. Core Features & Complex Logic
When modifying the site, pay special attention to these existing features:

*   **Video Audio (Crucial):** The presentation features background music (either a Spotify embed or a hidden YouTube Country Instrumental stream). **The background music MUST automatically pause/mute when a video slide (`.mp4` or `.mov`) plays**, and automatically resume when the next photo slide appears. The slideshow calls `AudioManager.duck()` and `AudioManager.unduck()` from `js/audio-manager.js`. Per-video volume is saved in each playlist item, can be boosted up to 300%, and uses Web Audio gain with a limiter above 100%.
*   **Presentation Modes:** The UI supports switching between distinct modes without reloading the page:
    *   *Walk-In (Prelude):* Random pool of memories.
    *   *7-Min Service:* A strictly timed (5.5s per photo) curated chronological sequence.
    *   *Walk-Out (Postlude):* Fresh pool of random memories.
    *   *Full Archive:* A grid view of all 400+ media items with text-search capabilities.
*   **Media Handling:** Web browsers cannot play `.heic` files natively. All Apple photos were converted to `.jpg` or `.png`. Ensure any newly added files are standard web formats.

## 5. The 7-Minute Service Narrative
The user requested a very specific narrative flow for the 7-minute live service presentation. If generating default playlists or updating `admin.js`, this sequence must be preserved:
1.  **Opening:** Close-up portrait of Bill (`Pic-BillGreatCloseUp.JPG`).
2.  **Wedding:** Bill and Janet's wedding photos.
3.  **Early Years:** Young photos of Bill, Janet, and their daughters.
4.  **Video Interlude 1:** Janet singing to Bill (`Video-JanetSingingSongToBill.MOV`).
5.  **Travels:** Trips to Alaska, Costa Rica, etc.
6.  **Outdoors & Hobbies:** Woodcutting, fishing, and 4-wheeling (including `Video-BillOn4Wheeler.mp4`).
7.  **Family & Grandkids:** Bill with babies/young people.
8.  **Video Interlude 2:** Fairview kids singing Happy Birthday (`Video-HappyBirthdaySongFromSchoolChildren.MOV`).
9.  **Full Family:** Group generational photos.
10. **Humor:** Bill's funny pictures (sombreros, goofy faces, bunny ears).
11. **Finale:** Locked final message (`Pic-FinalMessage.png`).

## 6. Standard Operating Procedure for Future Updates
*   **Media Registry:** `media-data.js` defines the `BILL_SERVICE_PLAYLIST`, `BILL_LONG_PLAYLIST`, and `BILL_MASTER_MEDIA` arrays. It exports them to `window`; `window.BILL_MEDIA` remains a compatibility alias for the master archive. The admin page can download a replacement `media-data.js` that preserves the current service and long-show curation.
*   **Adding Photos:** Do not attempt to build an upload form. To add photos, the user must put the `.jpg` into the `/media` folder and the AI should output a new line for the `BILL_MASTER_MEDIA` array in `media-data.js`.
*   **Updating CSS:** When providing updated CSS, ensure you do not overwrite the visibility utilities (e.g., `.hidden { display: none !important; }`), as this controls the SPA-like mode switching.
*   **Vanilla JS Rule:** Do not introduce React, Vue, jQuery, or build steps (Webpack/Vite). The user must be able to run this site locally on a computer without an internet connection if needed.