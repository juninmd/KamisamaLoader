---
name: React Frontend Development
description: Guidelines for React 19, Vite, and TailwindCSS development
---

# React Frontend Guidelines

## Core Tech Stack
- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: React Hooks (useState, useEffect, useMemo, etc.)

## Component Structure
- Use **Functional Components** with TypeScript interfaces for props.
- **Paths**: `src/components/` for shared components, `src/pages/` for views.
- **Reusability**: Extract complex UI logic into custom hooks or smaller components.

## Data Fetching & IPC
- Access backend features via `window.electronAPI`.
- **Pattern**:
  ```typescript
  useEffect(() => {
    const fetchData = async () => {
        try {
            const data = await window.electronAPI.someMethod();
            setData(data);
        } catch (error) {
            console.error(error);
        }
    };
    fetchData();
  }, []);
  ```
- Handle loading and error states in the UI.

## Styling (TailwindCSS)
- Use utility classes for layout, spacing, and typography.
- Use `clsx` or `tailwind-merge` for conditional class names if needed.
- Maintain consistency with the dark theme (e.g., `bg-slate-900`, `text-slate-100`).

## Icons
- Use `lucide-react` for iconography.
  ```tsx
  import { Download } from 'lucide-react';
  <Download className="w-4 h-4" />
  ```
