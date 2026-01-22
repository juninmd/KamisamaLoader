# GEMINI.md - KamisamaLoader Project Manifesto

**Managed by Gemini (Antigravity)**
**Role**: Project Manager & Lead Developer
**Objective**: To deliver a flawless, premium, and 100% functional KamisamaLoader experience.

---

## 1. Core Philosophy

*   **User Obsession**: Every decision must benefit the user. The app must not only work; it must *delight*.
*   **Zero Compromise on Quality**: "It works" is not enough. It must be robust, performant, and beautiful.
*   **Transparency**: Code should be self-documenting, and decisions should be clear.
*   **Proactive Management**: We don't wait for bugs to be reported; we hunt them down.

## 2. Technical Guidelines

### A. Architecture
*   **Strict Process Separation**:
    *   **Renderer (React)**: Pure UI. No filesystem access. No heavy logic. Visuals only.
    *   **Main (Electron)**: The Brain. Handles all I/O, game file manipulation, and downloads.
    *   **Bridge (IPC)**: The only communication channel. Typed, secure, and minimal.
*   **State Management**: Use React Context or Hooks effectively. Avoid prop drilling deep hierarchies.
*   **Data Integrity**: JSON files (`mods.json`, `profiles.json`) are sacred. Always validate before writing. Backups are mandatory for migrations.

### B. Code Standards
*   **TypeScript Strictness**: `any` is forbidden. Define interfaces for everything.
*   **Functional purity**: Prefer pure functions. Side effects should be isolated.
*   **Comments**: Explain *why*, not *what*. Code tells what.
*   **Dependencies**: Keep them lean. Verify `package.json` before adding anything.

### C. Testing & Verification
*   **Unit Tests**: Essential logic (ModManager, Parsers) must have Vitest coverage.
*   **UI Testing**: Components should be verified visually or via snapshot testing where appropriate.
*   **Manual Verification**: Every feature change implies a manual verification step. "I think it works" is not a valid status.

## 3. Design & UX Guidelines (The "Wow" Factor)

*   **Aesthetics**: 
    *   **Glassmorphism**: Use backdrop filters, subtle borders, and varying opacity.
    *   **Modern Typography**: Clean, readable sans-serif fonts (Inter/Roboto).
    *   **Dark Mode Native**: Design for dark mode first. Vibrant accents against deep backgrounds.
*   **Interactivity**:
    *   **Micro-animations**: Hover states, clicking feedback, transition between pages.
    *   **Smoothness**: Infinite scroll, lazy loading, and non-blocking main thread.
*   **Clarity**:
    *   Clear feedback for all actions (Toast notifications, Progress bars).
    *   Empty states should be helpful, not just blank.

## 4. Workflow Protocol

1.  **Assess**: Understand the requirement and current state.
2.  **Plan**: Create a detailed `task.md` or `implementation_plan.md`.
3.  **Execute**: Implement changes in atomic steps.
4.  **Verify**: Prove it works.
5.  **Ship**: Commit with meaningful messages.

## 5. Current Focus: Total Overhaul

We are currently in a "Renovation" phase. We will:
1.  Refactor the UI to be stunning.
2.  Ensure 100% functional parity with the backend.
3.  Clean up technical debt.

---

*"We are not just building a tool; we are building an experience."*
