# MeshFree Homepage Refinement, Modal Detail, and Motion Progress

## 1. Session Focus

This session continued from `20260418_2`, where the direction for the homepage Hero, geometry system, and integrated Gallery flow had already been defined.

The main focus in this round was:

- landing the homepage Hero visually
- refining geometry background motion
- making the top navigation feel more evenly distributed
- unifying `Submit` into `Upload`
- switching model detail from a full-page route to a large modal
- tightening the modal interaction and appearance

By the end of this session, the project moved from “homepage direction is discussed” to “the integrated homepage and Gallery experience is implemented and ready for further refinement.”

## 2. What Was Completed

### 2.1 Homepage Hero and Gallery are now implemented as one continuous page

The homepage now includes:

- a Hero section above the Gallery
- a continuous single-page flow from Hero into the model list
- `Gallery` navigation still scrolling to the gallery section
- document title and nav highlighting reacting to actual homepage scroll position instead of only click state

This means the homepage is no longer just a simple intro block plus a model list. It now has a clearer upper-screen presentation and browsing rhythm.

### 2.2 The Hero was changed into a frameless background geometry system

This session completed the following visual changes:

- removed the earlier large white Hero card
- removed the temporary extra English transition line
- placed the main heading and subheading directly on top of the background
- used red, yellow, and blue geometric forms as the main background layer
- added clear and blurred depth layers
- added position, rotation, and scale changes during scroll
- added a faster exit curve before the Gallery becomes the visual focus

The current version can still be refined, but the direction is now aligned with a background-driven Hero rather than a framed card.

### 2.3 The top bar was adjusted toward a more evenly spaced layout

The navigation was further tightened in this session:

- reduced the feeling of three separate left / center / right blocks
- placed `Gallery / Search / About / Sign in / Upload` into one navigation track
- switched navigation items to a more uniform column distribution
- kept `Upload` lightly emphasized without breaking the overall spacing rhythm

This brings the top bar closer to the previously discussed “evenly separated” layout goal.

### 2.4 User-facing `Submit` wording was unified into `Upload`

This session completed:

- replacing user-facing `Submit` wording with `Upload`
- renaming the upload page heading, button text, and supporting copy
- switching the main route to `/upload`
- keeping `/submit -> /upload` as a compatibility redirect

This fixed the inconsistent `Upload / Submit` wording across the frontend.

### 2.5 Model detail now opens as a large modal

The model detail experience was changed from a full-page route into a modal layered above the homepage:

- clicking a model card in the Gallery now opens a modal first
- the homepage and Gallery browsing position remain in the background
- the background receives a darkened blurred overlay
- clicking the backdrop closes the modal
- pressing `Esc` closes the modal
- directly opening `/models/:id` still shows a standalone detail page as a fallback

This means users no longer get thrown back to the top of the homepage after viewing a model and returning.

### 2.6 The modal received a first round of refinement

Several modal details were tightened during this session:

- removed the text-based `Close` button from inside the modal
- replaced it with a top-right close icon
- reduced the close icon size and moved it closer to the corner
- removed the unnecessary white button frame around the close control
- adjusted modal spacing so top and bottom padding feel more balanced
- stopped using the entire modal as a large scrolling container
- limited scrolling to the description area only when the description is too long

The visual design can still improve, but the interaction structure is now stable.

## 3. Main Files Touched

Most of the work in this session was concentrated in:

- `client/src/App.tsx`
- `client/src/components/Layout.tsx`
- `client/src/pages/HomePage.tsx`
- `client/src/pages/ModelDetailPage.tsx`
- `client/src/pages/SubmitPage.tsx`
- `client/src/index.css`

These files now cover:

- route layering and background routing
- top navigation structure
- homepage Hero, Gallery, and geometry motion
- model detail page and modal dual presentation
- upload naming unification
- global styling and modal styling

## 4. Confirmed Implementation Details

### 4.1 Title and active nav behavior

On the homepage, the document title and active section behavior now follow the current scroll area:

- Hero: `MeshFree-Home`
- Gallery: `MeshFree-Gallery`
- Footer / About: `MeshFree-About`

This means the UI now reflects where the user is browsing, not only what was clicked earlier.

### 4.2 Main geometry motion tuning points

If geometry motion needs more tuning later, the main control points are:

1. `client/src/pages/HomePage.tsx`
   - `window.scrollY / (viewportHeight * 0.66)`
   - `const exitProgress = Math.max((heroScrollProgress - 0.48) / 0.26, 0);`

2. `client/src/index.css`
   - `geometry-shape-red-haze`
   - `geometry-shape-yellow-orb`
   - `geometry-shape-blue-disc`
   - `geometry-shape-blue-ring`
   - `geometry-shape-red-bar`
   - `geometry-shape-yellow-chip`

The first group controls overall animation progress and exit timing. The second group controls how far and how strongly each shape moves.

### 4.3 Modal routing strategy

The modal detail view is currently implemented through:

- a `backgroundLocation`
- a layered modal route on top of the background route
- a normal standalone detail page when the model URL is opened directly

This gives the project:

- preserved Gallery browsing position
- sharable detail links
- a cleaner implementation without introducing a heavier global state system

## 5. Areas Still Open for Refinement

The main structure is now in place, but the following parts can still be improved:

- Hero geometry composition and motion rhythm
- top bar weight and overall polish
- the modal visual quality
- the detail layout becoming more like a true preview viewer

At this point, these are mostly product-polish concerns rather than missing core functionality.

## 6. What Was Discussed but Not Yet Implemented

The following directions were discussed but not formally implemented yet:

- real interactive 3D preview closer to a `Sketchfab`-style viewer
- a stronger left-large-preview / right-info-column modal layout
- using the modal as the future container for a proper 3D viewer

In other words, this session built the interaction shell first, but did not yet add real 3D viewer capability.

## 7. Current Stage Summary

As of `20260418_3`, the project now has:

- a fixed top bar with a unified `Upload` entry
- a single-page Hero / Gallery flow
- a geometry-based first screen on the homepage
- scroll-driven title and nav state
- a large modal model detail view above the Gallery
- a fallback standalone detail route

This means the frontend has moved from:

- a purely functional MVP interface

to:

- an MVP frontend that already carries some real product browsing rhythm and presentation structure

## 8. Suggested Next Steps

Recommended next directions:

- keep polishing modal aesthetics instead of replacing the interaction structure again
- move the modal layout closer to a viewer-style composition
- if 3D preview work starts, begin inside the detail modal before changing the upload flow
- keep adjusting homepage geometry in small, controlled steps instead of making the motion heavy all at once
