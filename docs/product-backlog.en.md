# MeshFree Product Backlog

## 1. Document Purpose

This document records the product issues, experience improvements, and future expansion directions currently identified for `MeshFree`.

It is not a promise that everything must be implemented in the current version. Instead, it serves as a continuously maintained product backlog to help with:

- unifying problem statements
- clarifying priorities
- keeping MVP scope under control
- supporting future iteration planning

## 2. Current Project Stage

The project is currently at the following stage:

- the three core `MeshFree MVP` loops are already connected
- real server deployment has been completed
- the current focus has shifted from "make the core functions work first" to "continue validation, patch key experience issues, and make small fixes or structural adjustments when needed"

Because of this, items in this backlog should follow these default principles:

- prioritize issues that affect current usability and risk
- be careful with structural changes
- do not prioritize large features that clearly exceed the current MVP scope

## 3. Priority Definitions

### `P0`

The most important issues to push during the current stage.

These issues usually affect:

- real usability
- user input safety
- submission risk
- clarity of the main website flow

### `P1`

Issues that are worth discussing soon and gradually implementing.

These usually improve:

- product polish
- information structure
- navigation clarity
- admin-side usability

### `P2`

Items worth keeping and discussing, but not suitable for immediate priority.

These usually belong to:

- structural upgrades
- long-term expansion directions
- capabilities beyond the current MVP scope

## 4. Short Roadmap for the Current Stage

### `P0`: Push First

1. Form draft protection
2. ZIP pre-upload preview and validation info
3. Remove default username from the admin login page
4. Unified admin entry logic
5. Top `tabbar` structure redesign

### `P1`: Near-Term Items

6. Footer information area
7. Move the admin entry to the footer
8. Unify icon, page title, and site naming
9. Admin permission cues and dangerous action protection
10. Standardize page opening behavior

### `P2`: Keep for Discussion

11. Chinese and English UI switching
12. UI / performance issue breakdown
13. Relationship between normal users and admin accounts
14. Website-to-`UE` import capability

## 5. Formal Backlog

### 5.1 Form Draft Protection

- Priority: `P0`
- Current judgement: should be discussed first and solved soon
- Core goal: prevent users from losing typed content when switching pages during submission or other input flows
- Key points:
  - which pages currently have input-loss risk
  - whether leaving-page warnings are needed
  - whether local temporary storage is needed
- Suggested approach:
  1. treat the submission page as the first protected target
  2. define draft save and cleanup rules
  3. later evaluate whether admin input areas also need protection

### 5.2 ZIP Pre-Upload Preview and Validation Info

- Priority: `P0`
- Current judgement: should be discussed early and is suitable for near-term implementation
- Core goal: reduce the risk of users uploading the wrong ZIP and improve submission quality
- Key points:
  - whether only file name, size, and format should be shown
  - whether internal ZIP directory structure should be parsed
  - where the boundary between frontend preview and backend validation should be
- Suggested approach:
  1. start with basic file information preview
  2. then evaluate whether an internal file list should be added
  3. keep the implementation lightweight and within MVP scope

### 5.3 Remove Default Username from Admin Login

- Priority: `P0`
- Current judgement: should be cleaned up soon
- Core goal: remove development/test traces and improve product professionalism
- Key points:
  - the difference between a default value and a placeholder
  - whether the public UI should hint at the admin account name
- Suggested approach:
  1. remove the default value
  2. use a normal placeholder prompt
  3. keep the login page neutral

### 5.4 Unified Admin Entry Logic

- Priority: `P0`
- Current judgement: worth defining early
- Core goal: make admin login and admin dashboard access feel like one coherent product entry
- Key points:
  - how logged-in users should go straight to the `dashboard`
  - how logged-out users should be routed to the login page
  - where users should return after logout
- Suggested approach:
  1. keep only one admin entry in the public UI
  2. route based on login state
  3. still keep separate page responsibilities for login and dashboard

### 5.5 Top `tabbar` Structure Redesign

- Priority: `P0`
- Current judgement: suitable to define direction now
- Core goal: make the top navigation better match the visitor main flow and product path
- Key points:
  - which items must stay in the top navigation
  - whether the admin entry should move downward
  - how to leave room for a future normal-user system
- Suggested approach:
  1. reorganize navigation around the visitor core path
  2. avoid letting admin features dominate the main top nav
  3. consider it together with the `footer`

### 5.6 Footer Information Area

- Priority: `P1`
- Current judgement: suitable for near-term implementation
- Core goal: add a basic site information area to improve completeness and credibility
- Key points:
  - what should appear in About
  - how GitHub and author info should be presented
  - whether it should be combined with the admin entry
- Suggested approach:
  1. add a unified `footer` area
  2. include About, GitHub, and author info
  3. keep the content lightweight rather than building a heavy content page

### 5.7 Move the Admin Entry to the Footer

- Priority: `P1`
- Current judgement: direction is reasonable and should be considered together with navigation restructuring
- Core goal: reduce the visual weight of the admin entry on public-facing pages
- Key points:
  - whether access should still remain convenient
  - how it should coexist with footer information
- Suggested approach:
  1. remove the admin entry from the top main navigation
  2. place it in the `footer` as a secondary entry
  3. connect it with the unified admin entry logic

### 5.8 Unify Icon, Title, and Site Naming

- Priority: `P1`
- Current judgement: suitable to handle relatively early
- Core goal: unify site branding and improve recognizability in demos and browser tabs
- Key points:
  - the formal site name
  - browser title conventions
  - `favicon` and admin page naming
- Suggested approach:
  1. define the main site name
  2. standardize page `title` format
  3. add a `favicon` and basic brand details

### 5.9 Admin Permission Cues and Dangerous Action Protection

- Priority: `P1`
- Current judgement: worth defining soon
- Core goal: make admin actions feel more permission-sensitive and reduce accidental mistakes
- Key points:
  - which actions require confirmation
  - whether admin-specific visual cues are needed
  - how dangerous buttons should look
- Suggested approach:
  1. prioritize dangerous action protection
  2. then add clearer admin visual cues
  3. do not rush into a fully separate theme

### 5.10 Standardize Page Opening Behavior

- Priority: `P1`
- Current judgement: suitable to define as a rule now
- Core goal: standardize internal navigation, external links, and download behavior to reduce interaction inconsistency
- Key points:
  - whether internal pages should always open in the current tab
  - whether external links should always open in a new tab
  - whether downloads should stay in the current page context
- Suggested approach:
  1. define one consistent rule for the whole site
  2. later check each entry point against that rule
  3. record exceptions separately

### 5.11 Chinese and English UI Switching

- Priority: `P2`
- Current judgement: direction is reasonable, but it should not be added in a piecemeal way now
- Core goal: provide UI language switching to improve presentation quality and internationalization completeness
- Key points:
  - whether text content is fully abstracted
  - how errors, buttons, and page copy will be maintained in two languages
  - how future pages will stay in sync
- Suggested approach:
  1. first decide whether this belongs in the next stage
  2. if yes, implement it as a proper i18n system
  3. avoid ad hoc string branching

### 5.12 UI / Performance Issue Breakdown

- Priority: `P2`
- Current judgement: not suitable as one vague umbrella task
- Core goal: split the unclear idea of "UI performance issues" into concrete, judgeable tasks
- Key points:
  - whether the problem is visual polish or runtime performance
  - whether real lag exists or the experience only feels rough
  - whether optimization goals are measurable
- Suggested approach:
  1. split the large topic into concrete issues first
  2. then classify them into backlog items
  3. avoid treating a broad concept as a direct task

### 5.13 Relationship Between Normal Users and Admin Accounts

- Priority: `P2`
- Current judgement: suitable for long-term direction planning, not for current refactoring
- Core goal: define a future permission model before a normal user system is added
- Key points:
  - whether admins belong to the same account system
  - how role differences should be expressed
  - whether the current MVP needs structural preparation for the future
- Suggested approach:
  1. keep the current independent admin implementation for now
  2. define the long-term direction as "one account system plus role permissions"
  3. refactor only after normal-user features enter scope

### 5.14 Website-to-`UE` Import Capability

- Priority: `P2`
- Current judgement: worth keeping as a direction, but not urgent to implement
- Core goal: improve the convenience of importing website resources into `UE`, exploring a path from resource site to toolchain platform
- Key points:
  - whether the goal is "easier import" or "deep UE workflow integration"
  - whether this is mainly a resource packaging issue, a tooling issue, or a plugin issue
  - whether it belongs in the current project stage
- Suggested approach:
  1. keep it as a long-term expansion direction
  2. in the short term, consider UE-friendly resource packaging rules
  3. only later evaluate plugins or bridge tools

## 6. Recommended Near-Term Focus

If the current backlog needs to be compressed into a smaller and more realistic near-term scope, the recommended focus is:

- form draft protection
- ZIP pre-upload preview and validation info
- removing the default admin username
- unified admin entry logic
- top `tabbar` structure redesign
- footer information area plus admin entry relocation

These items best match the current stage goal: improve real experience, structural clarity, and product polish without clearly expanding the project scope.
