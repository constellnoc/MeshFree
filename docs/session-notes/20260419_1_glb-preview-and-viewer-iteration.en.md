# MeshFree ZIP-based GLB Preview and Viewer Iteration Summary

## 1. Main Theme

This session focused on moving real 3D preview from a previously discussed future direction into a working first implementation.

Instead of only discussing whether a viewer should exist, this round actually implemented and refined the following:

- Whether submissions should continue to use `ZIP` as the unified upload format
- How to auto-detect a previewable `.glb` inside a `ZIP`
- How to connect a real 3D preview flow to the model detail UI
- How to iterate on the viewer experience using a real sample model

By the end of this session, the project had moved from “the modal shell is ready” to “the real 3D preview pipeline is initially connected and the viewer has entered an experience-polishing phase”.

## 2. What Was Completed

### 2.1 The `ZIP -> auto-detect GLB -> detail preview` route was confirmed and implemented

This round formally confirmed and implemented the following route:

- The submission entry remains `cover + zip`
- No separate “upload glb directly” branch was added
- The server now attempts to locate the first `.glb` inside the uploaded `ZIP`
- If found, the preview model path is stored
- If not found, the main submission flow is not blocked

This means the project has moved from “only storing cover images and ZIP downloads” to “starting to support real preview-model extraction”.

### 2.2 The database and backend preview pipeline are now connected

The backend work completed in this round includes:

- Adding `previewModelPath` to `Submission`
- Creating a dedicated utility module for extracting `.glb` files from `ZIP`
- Returning `previewModelUrl` from the detail API
- Removing extracted preview files when a submission is deleted

This means the preview flow is no longer a frontend-only mock, but is connected to the real upload and data pipeline.

### 2.3 The detail page now supports entering a real 3D preview from the cover image

The model detail preview area was changed to:

- Show the cover image by default
- Show `Preview` on hover
- Open a dedicated large viewer layer when clicked

Instead of:

- Permanently auto-loading 3D inside the original image area
- Or forcing the viewer to live directly inside the detail layout from the beginning

As a result:

- The initial experience remains lightweight
- User intent becomes clearer
- The viewer can behave like a proper large preview surface instead of a small in-place replacement

### 2.4 The large viewer layer now has a first-round interaction set

The viewer now supports:

- Opening a dedicated large preview layer after clicking `Preview`
- Drag-to-rotate
- Scroll-to-zoom
- `Reset view`
- `Close`
- `Esc` to close

At the same time, the reset logic was changed from “rebuild the canvas” to “reset the actual camera and controls”, which avoids sudden jumps and broken zoom behavior.

### 2.5 Viewer materials and controls were iterated using a real sample model

This round did not stop at “the viewer renders at all”. A real local sample, `test_c.zip`, was used to validate and iterate on the experience.

Using that real sample, the following work was completed:

- Creating a locally approved test model record
- Inspecting the `GLB` material structure
- Confirming that the model uses `KHR_materials_pbrSpecularGlossiness`
- Adding first-round compatibility handling for that older material extension
- Restoring `diffuseTexture` / `normalTexture` as part of that compatibility attempt
- Continuing to reduce overly shiny and artificial surface behavior based on actual viewer results

This means the viewer is no longer only tested against ideal modern glTF assumptions, but is already being adjusted against real-world model compatibility issues.

### 2.6 The viewer now supports four background presets

Based on later feedback, viewer background presets were added and the default was changed to white.

The current presets are:

- `White`
- `Black`
- `Soft White`
- `Soft Black`

In addition:

- The default viewer background is now `White`
- The user can switch backgrounds directly from the viewer toolbar
- Buttons and helper text receive basic style adaptation depending on the active background

This means the viewer now has a first step toward showing models in multiple presentation environments.

## 3. Main Code Files Involved

This round mainly touched:

- `server/prisma/schema.prisma`
- `server/prisma/migrations/20260419034129_add_preview_model_path/migration.sql`
- `server/src/lib/modelPreview.ts`
- `server/src/routes/submissions.ts`
- `server/src/routes/models.ts`
- `server/src/routes/admin.ts`
- `client/src/types/model.ts`
- `client/src/pages/ModelDetailPage.tsx`
- `client/src/components/ModelPreviewViewer.tsx`
- `client/src/index.css`

These files are responsible for:

- Database field expansion
- Preview-model extraction and cleanup
- Returning preview URLs from the detail API
- Cover-image-to-viewer interaction
- 3D viewer rendering logic
- Background presets, toolbar controls, and large modal styling

## 4. Confirmed Implementation Details

### 4.1 First-round preview file rule

The current first-round rule is:

- Only detect `.glb` files inside uploaded `ZIP` files
- Do not yet support `.gltf + external resources`
- If no `.glb` is found, keep the cover-image and ZIP-download experience

This means the first real preview capability is still intentionally scoped to MVP constraints.

### 4.2 Current viewer interaction structure

The interaction flow is now:

1. Show the cover image in model detail
2. Show `Preview` on hover
3. Open a dedicated viewer modal on click
4. Rotate, zoom, reset, and close inside that modal

This means the viewer has already been separated from the detail information layout and is no longer treated as just an inline image replacement.

### 4.3 Material compatibility is still under active refinement

Although this round added a first compatibility pass for `KHR_materials_pbrSpecularGlossiness`, the current material result should not yet be considered final.

Known conclusions at this stage include:

- Missing color was not only a lighting problem
- The real issue is tied to legacy material-extension compatibility
- The viewer now attempts to manually restore textures and normal maps for that older material type
- The final “real flower petal” material feel still needs more refinement

In other words, the viewer has moved from “completely white / clearly wrong material” to “now entering the stage of real material tuning”, but that stage is not yet complete.

## 5. Verification and Local Integration

This round included:

- Frontend and backend build checks
- ZIP extraction verification with a ZIP containing a `.glb`
- Verification that `previewModelUrl` is empty when no `.glb` exists
- Local UI integration using the real desktop sample `test_c.zip`
- Confirmation that the local sample model detail can return `previewModelUrl`

This round also surfaced and resolved several local integration issues, such as:

- `better-sqlite3` being compiled against a different Node version
- Old backend processes occupying the port and returning stale results
- The viewer needing iterative adjustment based on a real sample instead of only ideal assumptions

This means the pipeline is not just a written plan anymore, but has already been exercised in a real local runtime flow.

## 6. Areas Still Open for Improvement

Although the first real preview chain is now working, several areas still need refinement:

- Legacy material models still need better realism
- The viewer’s default camera framing can still become more like a professional previewer
- The background-switch buttons can still be made more self-explanatory
- Lighting behavior can still be tuned more carefully against each background preset
- If more formats are needed later, the ZIP detection rules will need to expand

At this stage, the main question is no longer “does a viewer exist”, but “is the viewer good enough and convincing enough”.

## 7. Current Stage Conclusion

As of `20260419_1`, the project now has:

- A first-round `GLB` auto-detection pipeline while keeping unified `ZIP` uploads
- A detail API that returns a real `previewModelUrl`
- A default cover-image flow that enters the viewer on click
- A dedicated large 3D preview modal
- Basic rotate, zoom, reset, and close capabilities
- Ongoing material-compatibility and appearance iteration using a real sample model
- Four viewer background presets, with white as the default

This means the frontend has moved from:

- A detail page that only shows a cover image and ZIP download

to:

- A model-browsing experience that now has real 3D preview capability and has entered viewer-experience refinement

## 8. Suggested Next Steps

The next priorities should be:

- Continue refining realism for legacy-material models such as `KHR_materials_pbrSpecularGlossiness`
- Further tune the relationship between viewer framing, lighting, and background presets
- If format support is expanded later, prioritize `ZIP` support for `gltf + external resources`
- If the viewer continues to grow in complexity, consider splitting the toolbar, background switching, and state messaging into more focused components
