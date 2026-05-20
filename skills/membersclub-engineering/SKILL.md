---
name: membersclub-engineering
description: Engineering principles and standards for the Members Club SaaS platform (app.mymembersclub.com.br). Use this skill ALWAYS — every time the user asks to build, fix, refactor, or modify ANY part of the Members Club codebase. Triggers on any mention of Members Club, workspace, producer, aluno, vitrine, curso, area de membros, enrollment, webhook, or any feature/bug work on this project. Enforces senior-level engineering discipline — diagnosis before action, incremental phases, zero regressions, industry-standard patterns (Anthropic/Google/Meta level). Never takes shortcuts. PT-BR and EN.
---

# Members Club — Engineering Standards

This skill governs ALL engineering work on the Members Club SaaS platform. Every change — feature, bugfix, refactor, or investigation — follows these principles without exception.

---

## PART 1 — CORE PRINCIPLES (Non-Negotiable)

### The Prime Directive

**Never take the easy path. Take the BEST path.** Engineer at the level of Anthropic, Google, Meta. Members Club is a serious business — everything must be done right, industry-standard.

### P1 — Sinuca (Think Moves Ahead)

Every decision must be analyzed considering **future consequences**, not just immediate gain. Like in billiards — don't just think "which ball to pocket now", think "where will the cue ball land, and what's my next shot?"

**Apply to architectural/permanent decisions:**
- Library/framework choice
- Folder structure, naming conventions
- Database schema changes
- Design system tokens
- Build tool configuration

**How to apply:**
1. List options honestly (minimum 2-3)
2. For each, project 3-5 future scenarios (growth, refactors, requirement changes)
3. Identify which option handles more scenarios without rework
4. Recommend the most robust option, BUT leave final decision to the founder
5. Acknowledge trade-offs honestly — no option is perfect

**Do NOT apply deep analysis to trivial operational decisions** (approval clicks, read-only commands). For those, trained intuition suffices.

### §3.5 — Critical Re-reading Discipline

Before committing to anything:

1. **Read canonical files ENTIRELY before editing** — editing globals.css? Read the whole file first. Editing a layout? Read the whole layout.
2. **Review own output critically before delivering** — before sending long response, re-read as adversary: "what is wrong / missing / inconsistent here?"
3. **Validate math + visual** — technically correct code is not enough. If it generates visual output, validate visually. Theoretical calculation can be right but rendered result wrong.
4. **Demand mutual re-reading** — if the founder seems to have skipped a canonical document, remind: "before proceeding, worth re-reading X."

### Continuous Learning Capture

During work, **capture learnings continuously** — small rules, patterns, anti-patterns, discoveries. Each learning has fixed format:
Learning #N — Short Actionable Title
Context: real situation that motivated it
Lesson: what we learned / rule established
Correct pattern: how to apply going forward
Anti-pattern: what NOT to do
Source: date + situation that originated it

At the end of large work blocks, proactively offer: "worth capturing Learning #N about X?"

### Snapshots (Cross-Session Continuity)

When sessions get long or dense, proactively offer to generate a snapshot document covering:
1. Current technical state (branch, last commit, next step)
2. Accumulated learnings
3. Pending strategic decisions
4. Concrete next actions

Suggest snapshot when: ~30+ dense turns, several important decisions covered, user mentions "pausing" or "continuing tomorrow", 10+ learnings without snapshot.

### Communication Tone

**Brutal honesty, calibrated:**
- Point out when a proposal has structural flaws
- Recommend different option from what was asked if honest analysis indicates
- Admit uncertainty ("I do not know", "two viable options, depends on X")
- ONE apology when wrong, then fix it — no excessive self-flagellation
- Demand disciplines if founder skips them ("apply §3.5 first")

**Never do:**
- Automatic praise ("great question!", "excellent!", "perfect!")
- Agree to please when honest analysis says otherwise
- Excessive qualifiers ("if you want", "maybe", "a suggestion would be")
- Excessive apologies — once is enough, then fix

**Depth calibration:**

| Question type | Calibration |
|---|---|
| Architectural decision (folder structure, schema, tokens) | Deep analysis — tables, scenarios, P1 sinuca |
| Operational decision (run install, approve click) | Brief — 1-3 lines |
| Security/integration change (webhooks, tokens, auth) | Deep analysis — verify data first |
| CSS visual fix (1-2 classes) | Brief with validation |

---

## PART 2 — MANDATORY ANALYSIS (Before ANY Action)

### 1. Full Diagnosis

Read the ACTUAL current state of affected files (never assume)
Consider that the last command may NOT have executed correctly
Map all dependencies (direct and indirect)
Identify business rules in play
Check recent changes that may interact
Understand the REAL objective (not just the surface request)
Verify data in the DATABASE before changing code (SQL queries first)
Never assume "it works" from code analysis alone — test with real data


### 2. Risk Assessment (answer ALL before proceeding)

Is this change small, medium, or large?
What is the risk level?
Which parts of the system can be impacted?
Is there risk of breaking existing functionality?
Which dependencies can be affected directly or indirectly?
Is this really the best approach?
Is there a smarter, simpler, or safer solution?
Is it better to refactor, adapt, or create new?
Should we create a separate branch?
What tests need to be done?
What needs monitoring after implementation?
Which functions, modules, integrations or flows can suffer impact?
Where exactly will impacts occur?
What must be adjusted to keep everything working?


### 3. Branch Decision

| Change Size | Risk | Branch Required? |
|-------------|------|-----------------|
| Small (1-2 files, CSS only) | Zero/Low | No |
| Medium (3-5 files, logic changes) | Low/Medium | Recommended |
| Large (layout refactor, schema change) | Medium/High | **Mandatory** |

---

## PART 3 — IMPLEMENTATION RULES

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

### Testing as Every User Type
- Always test as **producer** AND **student** AND **admin**
- hasAccess logic must cover all roles (never simplify)
- What works for one role may break for another

---

## PART 4 — ARCHITECTURE (Members Club Specifics)

### Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL) + Prisma ORM
- **Auth**: Custom workspace auth (not Supabase Auth)
- **Hosting**: Vercel (gru1 region) + Cloudflare WAF
- **Repo**: github.com/viniciusxavierbmx2016/applyfy-mvp

### Theme System — 3 Independent Namespaces
+---------------------------------------------+
| --producer-*  (8 vars)                      |
| Scope: /producer/**                         |
| Set by: ProducerThemeProvider (SSR)         |
| Source: user.themeConfig (JSON)             |
| Method: <style> SSR in server layout        |
+---------------------------------------------+
| --member-*  (6 vars)                        |
| Scope: /(course)/**                         |
| Set by: course layout (SSR)                |
| Source: course.memberColor fields          |
| Method: <style> SSR + .course-customized   |
|         CSS overrides (70+ rules)           |
+---------------------------------------------+
| --vitrine-  (reuses --producer-* vars)     |
| Scope: /w/[slug]/**                         |
| Set by: workspace layout (SSR)             |
| Source: workspace.vitrine*Color fields      |
| Method: <style> SSR in server layout        |
+---------------------------------------------+

### CSS Specificity Rules (CRITICAL — learned the hard way)

1. **Dark mode overrides MUST use .dark guard**: .dark .course-customized .dark\:bg-gray-900 { ... }
2. **Light mode overrides MUST use html:not(.dark) guard**: html:not(.dark) .course-customized .bg-white { ... }
3. **Never use :not(.dark) without html:** — it checks ANY ancestor, not just html
4. **Tailwind tokens migrated to bg-card/bg-primary need SEPARATE override rules** in .course-customized
5. **!important beats inline styles** — use arbitrary classes bg-[var(--member-X,...)] instead of inline style={} when inside .course-customized
6. **Arbitrary classes escape CSS overrides** — use them for elements that need their OWN var (sidebar, header) instead of being captured by generic overrides
7. **dark:bg-card/50 DOES NOT WORK with CSS variables** — Tailwind cannot apply opacity to var(...). Use dark:bg-gray-800 for inputs.

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
  course.memberBgColor && "--member-bg: " + course.memberBgColor,
  course.memberCardColor && "--member-card: " + course.memberCardColor,
  // ... other vars
].filter(Boolean).join("; ");

return (
  <>
    {memberVars && <style dangerouslySetInnerHTML={{ __html: ":root { " + memberVars + " }" }} />}
    <ClientShell>{children}</ClientShell>
  </>
);
```

### Server Component Migration Pattern

When converting client layout to server to eliminate flash:
1. Extract client parts to Shell component (useState, useEffect, event handlers)
2. Create getEntityMeta() cached Prisma helper
3. Convert layout to async server component
4. Inject style with CSS vars SSR
5. Pass data to Shell via props (no fetch in Shell)
6. **Replicate access logic EXACTLY** — use same functions (e.g., isEnrollmentActive) as the API

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
Producer area:  dark:bg-white/5 (translucent, platform standard)
Vitrine:        dark:bg-card (respects --producer-card via Tailwind token)
Course area:    dark:bg-gray-900 (captured by .course-customized override)
Inputs:         dark:bg-gray-800 (solid, never dark:bg-card/50)

### Upload Handling
- Vercel limit: 4.5MB request body
- Always compress images client-side before upload (canvas + toBlob)
- Show clear error messages for 413/400/generic errors
- Use shared compressImage() from component, NOT inline

### Integration Security (Applyfy Webhooks)
- Tokens MUST be per-workspace (applyfy_token:workspaceId)
- NO global fallback tokens — each workspace configures its own
- API save MUST return error when workspace not resolved (never silent skip with ok: true)
- Webhook validation uses safeCompare (constant-time) — never ===
- Webhook always returns HTTP 200 (contract with payment platform)
- Inactive workspaces reject webhooks
- Everything logged (audit trail)
- Migrate data BEFORE removing code (URLs before fallback removal)

### Shared Utilities — Single Source of Truth
- darkenHex() in src/lib/color-utils.ts (never duplicate)
- isEnrollmentActive() in src/lib/auth.ts (reuse everywhere)
- getWorkspaceMeta() in src/lib/workspace-meta.ts
- getCourseMeta() in src/lib/course-meta.ts
- getCurrentUser() in src/lib/auth.ts (cached per request)

---

## PART 5 — FORBIDDEN SHORTCUTS

| Shortcut | Why Forbidden | Correct Approach |
|----------|--------------|-----------------|
| Duplicate utility functions | Divergence over time | Extract to src/lib/ shared module |
| Inline style={} inside .course-customized | !important in CSS override wins | Use arbitrary class bg-[var(--X,...)] |
| dark:bg-card/50 | Tailwind cannot apply opacity to CSS vars | Use dark:bg-gray-800 |
| hasAccess = !!enrollment | Ignores admin/producer + allows expired | Use isEnrollmentActive() + role checks |
| :not(.dark) without html: | Matches any ancestor without .dark | Use html:not(.dark) |
| Fix without diagnosis | Causes cascading regressions | Full diagnosis FIRST |
| Large changes without branch | No rollback possible | Branch for medium+ changes |
| Assume last command worked | May have failed silently | Verify actual state before proceeding |
| Assume works from code analysis | Code can look correct but data says otherwise | Verify with SQL/real data |
| API returns ok: true on silent failure | Producer thinks saved but nothing happened | Return explicit error with message |
| Global fallback tokens | Security backdoor | Per-entity tokens only |
| Remove code before migrating data | Breaks production silently | Migrate data first, remove code after |
| Mark push SUCCESS without verifying | False positive in logs | Return count sent, mark SKIPPED if 0 |
| Notify only on moderation-pending | Producer misses approved comments | Notify on ALL new comments from students |

---

## PART 6 — MODULE PROTECTION

Some files are critical and require EXTRA caution:
- module-carousel.tsx — Complex carousel with navigation, touch, hover scale. Branch mandatory.
- globals.css — 70+ CSS override rules. Test both light AND dark mode after ANY change.
- (course)/layout.tsx — Controls course access. Verify hasAccess logic matches API.
- producer/layout.tsx — Server component, SSR theme. Changes affect entire producer area.
- webhook routes — Affect real revenue. Never remove fallbacks without data verification first.
- automation-engine.ts — Affects real users. Test idempotency, verify logs are honest.

---

## PART 7 — SESSION LEARNINGS (Accumulated)

### L1 — Verify data in DB before changing code
**Context:** Token Applyfy disappeared — code analysis said it should work, SQL showed it was not saved.
**Lesson:** Always query the database to verify actual state before proposing code changes.

### L2 — Never assume works from code analysis alone
**Context:** CSS overrides looked correct theoretically, but cards showed white in dark mode.
**Lesson:** Code reading + DevTools testing + real user verification. All three.

### L3 — Test as every user type
**Context:** SSR migration broke hasAccess for producers (only checked enrollment, not role).
**Lesson:** Always test as producer, student, AND admin after access-control changes.

### L4 — Reuse existing functions, never reimplement
**Context:** isEnrollmentActive existed in auth.ts but was reimplemented inline in layout.
**Lesson:** Single source of truth. Search for existing functions before writing new logic.

### L5 — API must return honest errors
**Context:** Token save returned ok: true even when workspace was null (silent skip).
**Lesson:** Never return success when operation did not execute. Explicit errors always.

### L6 — Global fallbacks are security backdoors
**Context:** applyfy_token global allowed any workspace to process webhooks with one token.
**Lesson:** Per-entity isolation. Remove global fallbacks after migrating all dependents.

### L7 — Migrate data before removing code
**Context:** Needed to verify 0 traffic on legacy route before removing fallback.
**Lesson:** Change URLs/config first, verify with data, only then remove code.

### L8 — !important beats inline styles
**Context:** Inline style={{ backgroundColor: var(--member-header) }} was overridden by CSS !important.
**Lesson:** Inside .course-customized, use arbitrary classes instead of inline styles.

### L9 — Arbitrary classes escape CSS overrides
**Context:** Sidebar and header needed their OWN var, not the generic card override.
**Lesson:** bg-[var(--member-sidebar,...)] is not captured by .course-customized .dark:bg-gray-900 rule.

### L10 — Push SUCCESS does not mean delivered
**Context:** AutomationLog showed SUCCESS but user had no PushSubscription.
**Lesson:** sendPushToUser returning without error does not equal push delivered. Check subscription count.

### L11 — Notifications need multiple channels
**Context:** SEND_PUSH only sent push, not bell notification. If push fails, user gets nothing.
**Lesson:** Always create Notification (bell) + attempt push. Bell is the reliable fallback.

---

## PART 8 — COMMIT AND POST-IMPLEMENTATION

### Commit Standards
- One logical change per commit
- Descriptive message: fix: , feat: , refactor: , chore: , security:
- Build MUST pass before commit
- Push after each successful commit

### Post-Implementation Checklist
- Monitor for regressions
- Test in both light and dark mode
- Test with and without customization
- Test as producer AND as student AND as admin
- Verify mobile if layout changed
- Cmd+Shift+R (hard refresh) to clear cache
- Verify in database that data was actually saved
- Check WebhookLog / AutomationLog for honest status
