# shadcn Sidebar Polish

**Date:** 2026-06-04
**Scope:** Frontend only — `frontend/` directory

## Goal

Replace raw Tailwind utility strings in the sidebar with shadcn/ui components, themed to match the existing dark purple palette (`#b066ff` / `#6699ff`). Layout and visual identity stay unchanged.

## shadcn Setup

- Install shadcn with the `dark` base theme using `npx shadcn@latest init`
- Project uses **Tailwind v4** — use the shadcn Tailwind v4 path during init
- Configure `components.json` with path alias `@/components/ui`
- Override shadcn CSS variables in `globals.css` to match the existing palette:
  - `--primary`: `#b066ff`
  - `--ring`: `#b066ff`
  - Background and card colors mapped to `#0d0d1a` / `rgba(176,102,255,0.04)`

## Components to Install and Use

| shadcn component | Replaces |
|---|---|
| `Button` | Raw `<button>` in `PromptInput` and `WebcamToggle` |
| `Textarea` | Raw `<textarea>` in `PromptInput` |
| `Label` | Raw `<label>` in `PromptInput` |
| `Card`, `CardHeader`, `CardContent`, `CardFooter` | The wrapping `<div className="flex flex-col h-full p-5 gap-5">` in `PromptInput` |
| `Badge` | "Active" indicator on the current generation step |
| `Alert`, `AlertDescription` | The error `<div>` at the bottom of `PromptInput` |
| `Separator` | Visual divider between the prompt input section and the progress steps |

## File Changes

### `frontend/app/globals.css`
Add shadcn CSS variable overrides after the Tailwind directives, mapping the existing `--purple` and `--bg` values to shadcn's `--primary`, `--card`, `--background`, and `--ring` tokens.

### `frontend/components/PromptInput.tsx`
- Wrap the entire component body in `<Card>` with `<CardHeader>`, `<CardContent>`, `<CardFooter>`
- `<CardHeader>`: logo dot + "PROMPTTUBER" label + subtitle line
- `<CardContent>`: `<Label>` + `<Textarea>` + hint text + `<Button>` (generate) + `<Separator>` + progress steps with `<Badge>` on active step
- `<CardFooter>`: `<WebcamToggle />` (unchanged — WebcamToggle handles its own button)
- Error state: replace raw div with `<Alert variant="destructive">` + `<AlertDescription>`

### `frontend/components/WebcamToggle.tsx`
- Replace raw `<button>` with shadcn `<Button variant="outline">`
- Keep the status dot and conditional text logic unchanged

## Behaviour Unchanged

- Generation flow, timers, Zustand store, WebSocket, and Live2D canvas are not touched
- All existing class overrides (gradient button, glow effects) applied via `className` on shadcn components — shadcn components accept `className` and merge it

## What Is Not Changing

- `Live2DCanvas.tsx` — no UI components, not touched
- `app/page.tsx` — layout unchanged
- `app/layout.tsx` — unchanged
- Zustand store, WebSocket lib — unchanged
