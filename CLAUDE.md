# Orbi project rules

Mandatory rules for every AI agent working in this project. Orbi is a hub (`app/page.tsx`) linking many small single-page tools (`app/orb<name>/`). Next.js 15 App Router, React 19, TypeScript.

---

## 1. Core rules

- Reply in Vietnamese; English only for technical terms and code. No filler, no echoing the question. Fix/cause in one or two lines.
- Every task that changes code ends with a written "Lưu ý" list in the reply text: what was skipped or not tested, and risks the user must know. It must be the LAST visible message of the turn: call the closing/next-step summary tool (wrap_up) WITHOUT a question/buttons, then write the final message with the "Lưu ý" list, and put any question (commit?...) as its last line. Never write the list before that tool call and never leave it only inside the summary box.
- Before finishing a code task: run `npm run lint`, `npx tsc --noEmit` and `npm test`, fix errors you introduced. For UI changes also open the page in the browser preview (desktop + 375px mobile) and check the console.
- Precedence with ponytail: ponytail governs logic and code volume; this file governs UI. Never drop for brevity: loading/empty/error states, aria/keyboard support, visible focus, `prefers-reduced-motion`.
- Search by name for an existing helper/component before creating a new one; don't scan unrelated tool folders.

---

## 2. Stack

- UI stack: ONLY Tailwind CSS v4, shadcn/ui, react-icons (`react-icons/lu` by default). No other UI/CSS/icon library, no CSS-in-JS, no emoji or raw SVG used as icons.
- Add shadcn components via `npx shadcn@latest add <name>` (`components.json` has `"tsx": true`), never hand-write them. Don't edit files in `components/ui/` except to wire tokens; restyle through the tool's tokens instead. Generated shadcn files may import `lucide-react`; that is the only place it's allowed, app code uses react-icons.
- Table, dropdown, select, dialog, tabs, tooltip: ALWAYS shadcn (`Table`, `DropdownMenu`, `Select`, `Dialog`, `Tabs`, `Tooltip`), never raw `<table>`/`<select>` or custom ones, even when ponytail says "use native". Other elements: native HTML + Tailwind is fine.
- No inline `style` and no new CSS modules. Only exception: passing a dynamic value as a CSS variable (`style={{ "--a": ... }}`) that Tailwind/CSS then reads.
- Use tokens (`bg-background`, `text-primary`, `text-muted-foreground`...) instead of hex or arbitrary values like `bg-[#1636a8]`.
- Existing code is still plain JS + plain CSS (`.jsx`/`.mjs`, `globals.css` hub styles, `*.module.css` in OrbType/OrbImage). It migrates to TS + Tailwind when that tool is reworked; don't mix both styles in one new component.
- Fonts: `next/font/google` only, exposed as a CSS variable and mapped in Tailwind (`font-sans`, `font-mono`, or a tool-specific `font-display`). No `<link>` to Google Fonts.
- Heavy work (ML models, image processing) runs in a Web Worker, never on the main thread.
- TypeScript everywhere: `.tsx` for components/pages, `.ts` for logic. `strict: true`; no `any` (use `unknown` and narrow), no `@ts-ignore` (use `@ts-expect-error` with a reason if truly needed). Type props inline or with a local `type`, no separate types folder.
- Shared data shapes get one exported type next to their source (e.g. `type Tool` in `app/tools.ts`), not redefined per file.
- Lint: ESLint flat config with `next/core-web-vitals` + `next/typescript`. Don't disable a rule to make an error go away; fix the code. A per-line `eslint-disable-next-line <rule> -- <reason>` is allowed only with a reason.
- Pure logic goes in a `.ts` file next to the tool with a `*.test.ts` beside it, run by `node --test --experimental-strip-types` (Node 22; type-only syntax, no enums/namespaces in tested files).
- `'use client'` is fine for a whole tool page: tools are interaction-heavy and have no server data.

---

## 3. Each tool has its own identity

Orbi is a collection, not one product: every tool gets its own look, chosen for what the tool does. Don't copy another tool's palette or font.

### Isolation (one token set per tool, shared token names)

- Every tool uses the same shadcn token names (`--background`, `--foreground`, `--card`, `--primary`, `--primary-foreground`, `--muted`, `--muted-foreground`, `--border`, `--ring`, `--destructive`, `--radius`), mapped once in `app/globals.css` via `@theme inline`. So `bg-primary` and every shadcn component work in every tool.
- Each tool sets its own VALUES for those tokens in a theme block in `app/globals.css`: `:root:has([data-tool="orbtype"]) { --background: ...; --primary: ...; }`, and its root element is `<main data-tool="orbtype">`. The `:root:has(...)` form makes `body` (and shadcn portals like Dialog) pick up the tool's colors too. Never put tool values in plain `:root`. Changing one tool must never change another.
- Dark tools add `data-dark` on `<main>` so shadcn's `dark:` variants apply (`@custom-variant dark` reads `[data-dark]`).
- Extra tokens a tool needs (e.g. OrbType's `--error-extra`) go in the same block and get a Tailwind name through `@theme inline`.
- Hex only appears in `app/globals.css` (theme blocks, or decorative CSS like the hub's starfield). `.tsx` files use token classes only, including SVG colors (give the element a class, color it in CSS).
- Plain `:root` holds the hub's theme (`data-tool` absent = hub). Shared shadcn components (`components/ui/`) stay unstyled beyond tokens, so they take each tool's look automatically.
- A tool's font is loaded in its `page.tsx`, exposed as a CSS variable on the root element, and used via its Tailwind font class. Default is the body font (Bricolage Grotesque from `app/layout.tsx`).

### Choosing a tool's style

- Start from the tool's subject: what the user is doing and what that world looks like (OrbType: a quiet code editor with a mono font; the hub: a galaxy orrery). Write the choice as a comment above the tool's theme block: `/* <Tool>: <idea in one line> */`.
- Pick 4–7 tokens: background, surface, text, muted text, one main accent, plus error/success only if the tool needs them.
- Contrast: body text ≥ 4.5:1 on its background, large text and UI borders ≥ 3:1. Never show a state by color alone.
- Support dark and light only if it fits the identity; a fixed theme is fine (OrbType and the hub are always dark).

### Shared across every tool (the only common parts)

- Header: tool logo on the left as `Orb<span>Name</span>` linking to the tool itself, and a back link `← Orbi` to `/` on the right.
- Page gutter at least 16px; layout works at 375px with no horizontal scroll.
- Keyboard: every action reachable by keyboard, visible focus ring in the tool's accent color.
- UI copy is Vietnamese, short and action-oriented. Buttons say exactly what happens ("Tải ảnh về", not "OK").

### Adding a tool

1. Create `app/orb<name>/page.tsx` with `<main data-tool="orb<name>">` and add its `:root:has([data-tool="orb<name>"])` theme block in `app/globals.css`.
2. Add one line to `app/tools.ts` (`slug`, `name` as `Orb<Name>`, `desc`, `icon` as a react-icons component like `LuKeyboard`, `category`). Reuse an existing `category` when it fits: each category is one orbit ring on the hub, so too many categories crowd the map.
