---
name: membersclub-engineering
description: Engineering principles and standards for the Members Club SaaS platform (app.mymembersclub.com.br). Use this skill ALWAYS — every time the user asks to build, fix, refactor, or modify ANY part of the Members Club codebase. Triggers on any mention of Members Club, workspace, producer, aluno, vitrine, curso, area de membros, enrollment, webhook, or any feature/bug work on this project. Enforces senior-level engineering discipline — diagnosis before action, incremental phases, zero regressions, industry-standard patterns (Anthropic/Google/Meta level). Never takes shortcuts. PT-BR and EN.
---

# Members Club — Engineering Standards

This skill governs ALL engineering work on the Members Club SaaS platform. Every change — feature, bugfix, refactor, or investigation — follows these principles without exception.

## The Prime Directive

**Never take the easy path. Take the BEST path.** Engineer at the level of Anthropic, Google, Meta. Members Club is a serious business — everything must be done right, industry-standard.

## Before ANY Action — Mandatory Analysis

Before writing a single line of code, ALWAYS:

### 1. Full Diagnosis
```
- Read the ACTUAL current state of affected files (never assume)
- Consider that the last command may NOT have executed correctly
- Map all dependencies (direct and indirect)
- Identify business rules in play
- Check recent changes that may interact
- Understand the REAL objective (not just the surface request)
```

### 2. Risk Assessment (answer ALL before proceeding)
```
- Is this change small, medium, or large?
- What is the risk level?
- Which parts of the system can be impacted?
- Is there risk of breaking existing functionality?
- Which dependencies can be affected directly or indirectly?
- Is this really the best approach?
- Is there a smarter, simpler, or safer solution?
- Is it better to refactor, adapt, or create new?
- Should we create a separate branch?
- What tests need to be done?
- What needs monitoring after implementation?
- Which functions, modules, integrations or flows can suffer impact?
- Where exactly will impacts occur?
- What must be adjusted to keep everything working?
```

### 3. Branch Decision
| Change Size | Risk | Branch Required? |
|-------------|------|-----------------|
| Small (1-2 files, CSS only) | Zero/Low | No |
| Medium (3-5 files, logic changes) | Low/Medium | Recommended |
| Large (layout refactor, schema change) | Medium/High | **Mandatory** |

## During Implementation — Mandatory Rules

### Incremental Phases
- Divide EVERY implementation into small, clear, independent steps
- Explain the objective of each step BEFORE executing
- Validate the result of each step BEFORE advancing
- NEVER make large changes at once
- Each phase gets its own commit

### Preservation Rules
- Preserve ALL existing structure, architecture, patterns, and logic
- Avoid unnecessary refactoring
- Prioritize stability, compatibility, and predictability
- Guarantee backward compatibility whenever possible
- Think as the SENIOR ENGINEER who CREATED this system

### Absolute Rules
- NEVER advance without validation of the previous step
- NEVER remove existing logic without analyzing dependencies
- NEVER simplify by assuming implicit behavior
- ALWAYS explain what is being changed and WHY
- ALWAYS present risks before executing critical changes
- If ANY uncertainty exists, STOP and ASK before continuing
- Prioritize clarity, robustness, readability, and future maintenance
- Document important decisions during the process
- ALWAYS backup — the project was lost once before

## Architecture — Members Club Specifics

### Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL) + Prisma ORM
- **Auth**: Custom workspace auth (not Supabase Auth)
- **Hosting**: Vercel (gru1 region) + Cloudflare WAF
- **Repo**: github.com/viniciusxavierbmx2016/applyfy-mvp

### Theme System — 3 Independent Namespaces
```
┌─────────────────────────────────────────────┐
│ --producer-*  (8 vars)                      │
│ Scope: /producer/**                         │
│ Set by: ProducerThemeProvider (SSR)         │
│ Source: user.themeConfig (JSON)             │
│ Method: <style> SSR in server layout        │
├─────────────────────────────────────────────┤
│ --member-*  (6 vars)                        │
│ Scope: /(course)/**                         │
│ Set by: course layout (SSR)                │
│ Source: course.member*Color fields          │
│ Method: <style> SSR + .course-customized   │
│         CSS overrides (70+ rules)           │
├─────────────────────────────────────────────┤
│ --vitrine-*  (reuses --producer-* vars)     │
│ Scope: /w/[slug]/**                         │
│ Set by: workspace layout (SSR)             │
│ Source: workspace.vitrine*Color fields      │
│ Method: <style> SSR in server layout        │
└─────────────────────────────────────────────┘
```

### CSS Specificity Rules (CRITICAL — learned the hard way)
1. **Dark mode overrides MUST use `.dark` guard**: `.dark .course-customized .dark\:bg-gray-900 { ... }`
2. **Light mode overrides MUST use `html:not(.dark)` guard**: `html:not(.dark) .course-customized .bg-white { ... }`
3. **Never use `:not(.dark)` without `html:`** — it checks ANY ancestor, not just `<html>`
4. **Tailwind tokens migrated to `bg-card`/`bg-primary` need SEPARATE override rules** in `.course-customized`
5. **`!important` beats inline styles** — use arbitrary classes `bg-[var(--member-X,...)]` instead of inline `style={}` when inside `.course-customized`
6. **Arbitrary classes escape CSS overrides** — use them for elements that need their OWN var (sidebar, header) instead of being captured by generic overrides
7. **`dark:bg-card/50` DOES NOT WORK with CSS variables** — Tailwind can't apply opacity to `var(...)`. Use `dark:bg-gray-800` for inputs.

### Pattern: Direct var() consumption (preferred)
```tsx
// BEST — same pattern as course-sidebar, workspace-shell header/sidebar
bg-[var(--member-sidebar,rgb(249_250_251))] dark:bg-[var(--member-sidebar,rgb(3_7_18))]

// WHY: not captured by CSS overrides, works in both modes, fallback built-in
```

### Pattern: CSS override system (for mass coverage)
```css
/* Cards — dark mode with .dark guard */
.dark .course-customized .dark\:bg-gray-900 {
  background-color: var(--member-card, rgb(17 24 39)) !important;
}

/* Cards — light mode with html:not(.dark) guard */
html:not(.dark) .course-customized .bg-white {
  background-color: var(--member-card, #ffffff) !important;
}
```

### SSR Theme Injection Pattern (no flash)
```tsx
// Server layout — fetch theme, inject <style> BEFORE React hydrates
const memberVars = [
  course.memberBgColor && `--member-bg: ${course.memberBgColor}`,
  course.memberCardColor && `--member-card: ${course.memberCardColor}`,
  // ... other vars
].filter(Boolean).join("; ");

return (
  <>
    {memberVars && <style dangerouslySetInnerHTML={{ __html: `:root { ${memberVars} }` }} />}
    <ClientShell>{children}</ClientShell>
  </>
);
```

### Server Component Migration Pattern
When converting client layout to server to eliminate flash:
1. Extract client parts to `<Shell>` component (useState, useEffect, event handlers)
2. Create `getEntityMeta()` cached Prisma helper
3. Convert layout to `async` server component
4. Inject `<style>` with CSS vars SSR
5. Pass data to Shell via props (no fetch in Shell)
6. **Replicate access logic EXACTLY** — use same functions (e.g., `isEnrollmentActive`) as the API

### Access Control (hasAccess) — NEVER simplify
```tsx
// CORRECT — reuses isEnrollmentActive from @/lib/auth
const isCourseOwner = user.role === "PRODUCER" && 
  (course.ownerId === user.id || course.workspace.ownerId === user.id);
const isStaffViewer = user.role === "ADMIN" || isCourseOwner;
hasAccess = isStaffViewer || isEnrollmentActive(enrollment);

// WRONG — loses admin/producer access + allows expired enrollments
hasAccess = !!enrollment;
```

### Card Background Standard
```
Producer area:  dark:bg-white/5 (translucent, platform standard)
Vitrine:        dark:bg-card (respects --producer-card via Tailwind token)
Course area:    dark:bg-gray-900 (captured by .course-customized override)
Inputs:         dark:bg-gray-800 (solid, never dark:bg-card/50)
```

### Upload Handling
- Vercel limit: 4.5MB request body
- Always compress images client-side before upload (canvas + toBlob)
- Show clear error messages for 413/400/generic errors
- Use shared `compressImage()` from component, NOT inline

### Shared Utilities — Single Source of Truth
- `darkenHex()` → `src/lib/color-utils.ts` (never duplicate)
- `isEnrollmentActive()` → `src/lib/auth.ts` (reuse everywhere)
- `getWorkspaceMeta()` → `src/lib/workspace-meta.ts`
- `getCourseMeta()` → `src/lib/course-meta.ts`
- `getCurrentUser()` → `src/lib/auth.ts` (cached per request)

## Forbidden Shortcuts

| Shortcut | Why Forbidden | Correct Approach |
|----------|--------------|-----------------|
| Duplicate utility functions | Divergence over time | Extract to `src/lib/` shared module |
| Inline `style={}` inside `.course-customized` | `!important` in CSS override wins | Use arbitrary class `bg-[var(--X,...)]` |
| `dark:bg-card/50` | Tailwind can't apply opacity to CSS vars | Use `dark:bg-gray-800` |
| `hasAccess = !!enrollment` | Ignores admin/producer + allows expired | Use `isEnrollmentActive()` + role checks |
| `:not(.dark)` without `html:` | Matches any ancestor without `.dark` | Use `html:not(.dark)` |
| Fix without diagnosis | Causes cascading regressions | Full diagnosis FIRST |
| Large changes without branch | No rollback possible | Branch for medium+ changes |
| Assume last command worked | May have failed silently | Verify actual state before proceeding |

## Module Protection

Some files are critical and require EXTRA caution:
- `module-carousel.tsx` — Complex carousel with navigation, touch, hover scale. Branch mandatory.
- `globals.css` — 70+ CSS override rules. Test both light AND dark mode after ANY change.
- `(course)/layout.tsx` — Controls course access. Verify hasAccess logic matches API.
- `producer/layout.tsx` — Server component, SSR theme. Changes affect entire producer area.

## Commit Standards
- One logical change per commit
- Descriptive message: `fix: `, `feat: `, `refactor: `, `chore: `
- Build MUST pass before commit
- Push after each successful commit

## Post-Implementation Checklist
- Monitor for regressions
- Test in both light and dark mode
- Test with and without customization
- Test as producer AND as student
- Verify mobile if layout changed
- Cmd+Shift+R (hard refresh) to clear cache
