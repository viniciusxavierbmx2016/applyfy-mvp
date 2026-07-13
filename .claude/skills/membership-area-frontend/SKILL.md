---
name: membership-area-frontend
description: Design and implement member-facing frontend for the Members Club platform (app.mymembersclub.com.br) — a Brazilian membership-area SaaS for infoprodutos (course dashboards, lesson players, progress/trilha, community, profile, paywall, onboarding). Use this skill whenever the user asks to build, design, restyle, or review any screen of the member experience — even if they say "área de membros", "área do aluno", "player de aula", "tela de curso", "trilha", "dashboard do membro", or name specific competitors (Hotmart Club, MemberKit, Kajabi, Skool). Two modes: production code honors the codebase's real systems (tokens, .dark theming, producer colors, PWA limits); prototypes use the full aspirational system. Enforces a bold/disruptive Brazilian aesthetic in the Nubank/Canva/iFood lineage with billion-dollar polish, dark-mode-first, mobile-first, Portuguese-aware. Triggers across PT-BR and EN phrasings.
---

# Membership Area Frontend Design

This skill governs the **member-facing** surfaces of a Brazilian infoprodutos membership SaaS — everything the student/member sees after they log in. Creator admin, marketing pages, and checkout funnels are **out of scope** (different skills).

The product sits in the Hotmart Club / MemberKit / Kajabi / Skool category. It is **not** another one of those. It plays at billion-dollar brand level, with Brazilian cultural confidence and bold/disruptive DNA — Nubank's radical clarity, Canva's approachability, iFood's chromatic confidence. None of those are templates; they are the *register*.

## Members Club — production reality (read FIRST when the target is the real codebase)

This skill serves two modes. Know which one you are in before writing anything:

**Mode A — Production code** (the real Members Club codebase, app.mymembersclub.com.br): the project's existing systems WIN over this skill's generic prescriptions. The DNA below still governs *decisions* (hierarchy, one focal point, subtraction, PT-BR register) — but the *mechanics* come from the codebase. Verified facts:

- **Tokens**: use the project's 3 theme namespaces — `--producer-*` (8 vars, /producer/**), `--member-*` (6 vars, course area, via `.course-customized` + 70+ CSS override rules), `--vitrine-*` (/w/[slug]/**). Do NOT introduce this skill's `--ground-*`/`--ink-*` tokens into production — that creates a second, parallel token system (forbidden duplication per the engineering skill).
- **Brand color is NOT a designer choice** — it is white-label, set by the producer (course.member*Color / workspace theme). "One dominant color owns the room" translates to: honor the PRODUCER's color as the dominant; never hardcode a brand hex in production.
- **Theme mechanism**: `darkMode: "class"` — style with `.dark` variants only. `data-theme` exists in the DOM (mirrored by workspace-theme-lock for next-themes sync) but NO CSS consumes it; never style against it. Follow the engineering skill's specificity rules: `html:not(.dark)` for light overrides (never bare `:not(.dark)`); Tailwind tokens need separate override rules in `.course-customized`.
- **Typography reality**: the app (producer/member/admin) renders on the SYSTEM font stack (Tailwind default `font-sans`). Outfit/Jakarta/Instrument load ONLY in /landing; the Geist vars in the root layout are injected but unconsumed. Do not casually introduce fonts in a fix — a member-area type identity is a deliberate product decision for the founder to make; this skill's pairings below are the menu for that day, not a license.
- **Motion**: no framer-motion in the project. The pattern is CSS — existing keyframes `fadeIn`/`scaleIn`/`fadeInUp` (globals.css) + `slide-up` (tailwind.config) + Tailwind transitions. Reuse them; adding a motion library is an explicit product decision, not a side effect of a task.
- **Icons**: no icon library installed. 128 files use inline SVG — follow that pattern (match the sizing/class conventions of neighboring components).
- **PWA is real** (manifest.json + sw.js + push registration): the member area runs installed. ⚠️ iOS standalone LOCKS the horizontal axis — NEVER use `overflow-x-auto` for mobile carousels; the proven pattern is `overflow-hidden` + `translateX` via JS touch handlers (Instagram pattern). `touch-pan-x` and toggling overflowX mid-gesture do NOT work. Desktop keeps its own mechanism (translateX + buttons/wheel) — never alter it.

**Mode B — Prototypes, mockups, artifacts, explorations**: the full skill applies as written — starter tokens, font pairings, Motion for React artifacts, the works. This is where the aspirational system lives until the product adopts pieces of it deliberately.

## Before you code: decide three things

1. **Which surface is this?** The member area has ~10 canonical surfaces (see §Surface Patterns). Name it. Different surfaces obey different rules — a lesson player must recede; a dashboard must orient; a community must invite.
2. **Which user state?** First-session, active learner, returning-after-break, completionist, stuck, celebrating. The same screen serves each differently. Pick the dominant state and optimize for it; degrade gracefully for the others.
3. **Tone commitment.** Within the DNA below, commit to ONE posture per screen: quiet/refined *or* loud/celebratory *or* focused/workmanlike. Mixing them is how membership areas end up looking like Hotmart.

Only then write code.

## The DNA (non-negotiable)

### Brazilian posture, not Brazilian costume
- **Register**: warm, direct, confident. Adult, never professor-aluno. Brazilian calor without kitsch — no verde-amarelo, no folkloric flourishes, no samba-schooling.
- **Microcopy**: você, not o usuário. Short. Active. Brazilian rhythm in the phrasing ("bora", "vamo nessa", "tá tudo aqui") used *sparingly* as moments, not as a coat of paint.
- **Diacritics are typography**. Every layout must handle ç, ã, õ, é, á, í beautifully. Test display headings with real PT-BR strings ("Próxima aula", "Você concluiu", "Parabéns, conquista desbloqueada") — not Lorem Ipsum.

### Bold & disruptive (Nubank/Canva/iFood lineage)
- **Dominant color owns the room.** One brand color carries 50–70% of chromatic weight. Apologetic pastel-palette-of-six is forbidden — that is the default aesthetic of every cheap area-de-membros in Brazil and the fastest signal of not-premium.
- **Oversized, opinionated display type.** Member area hero moments (welcome, module intro, completion) use display at 48–96px with tight tracking. Never timid.
- **High-contrast moments.** Know where the eye goes first on every screen. Design for ONE focal point per surface, not four.
- **No purple-gradient-on-white.** That is the international signal of AI-slop SaaS. If purple is the brand color, earn it with black or ink-deep navy grounds.

### Premium by subtraction
- Empty space is status. Cheap membership areas cram because they are scared of looking empty. Confident ones breathe.
- One shadow style, one radius scale, one motion curve — applied with discipline across the whole product.
- If a decorative element doesn't earn its pixels, cut it.

## Color system

Default posture: **dark mode as primary** (video consumption lives in dark; dark reads as premium in this category — Netflix, YouTube, Skool). Light mode is a first-class alt, not an afterthought.

Token architecture (use CSS custom properties at `:root`, swap on `[data-theme="light"]`):

```css
:root {
  /* Ground (backgrounds, ink) */
  --ground-0: #0a0a0b;     /* deepest — behind everything */
  --ground-1: #141416;     /* default surface */
  --ground-2: #1d1d21;     /* raised surface (cards) */
  --ground-3: #28282e;     /* highest elevation */

  /* Ink (text on ground) */
  --ink-1: #fafafa;        /* primary text */
  --ink-2: #b8b8bf;        /* secondary */
  --ink-3: #7a7a82;        /* tertiary / captions */
  --ink-disabled: #4a4a52;

  /* Brand — ONE dominant, confident choice */
  --brand: [choose: vivid & ownable — not purple-on-white]; 
  --brand-ink: [text color that sits on --brand];

  /* Signal (status & celebration) */
  --signal-progress: [advancing — usually brand]; 
  --signal-complete: [success — green, but saturated, not sickly];
  --signal-locked:   [--ink-3];
  --signal-hot:      [urgent/live — red-orange, saturated];

  /* Radii & shadows — ONE scale */
  --r-sm: 6px; --r-md: 12px; --r-lg: 20px; --r-xl: 32px;
  --shadow-raise: 0 1px 2px rgb(0 0 0 / .4), 0 8px 24px rgb(0 0 0 / .3);
}
```

**Rules:**
- Never more than ONE brand color doing brand work on a screen. Accents are rare signals, not decoration.
- "Pastel pill for each category" is banned. If you must categorize, use typography, position, or a single iconographic cue — not a Skittles palette.
- Test every color on PT-BR text with caps/accents: "AULA CONCLUÍDA" must not vibrate or disappear.

## Typography

**Pair a characterful display with a technical body.** Never let the body font do display duty.

Vetted pairings (pick one per project; rotate across projects):
- **Cabinet Grotesk** (display) + **Geist** (body) — modern, confident, Canva-adjacent
- **Migra** / **Editorial New** (display, serif) + **Inter Tight** (body) — editorial premium
- **Neue Haas Grotesk** (display) + **IBM Plex Sans** (body) — workmanlike Nubank lineage
- **Clash Display** (display) + **General Sans** (body) — loud, young

**Forbidden defaults**: Arial, Roboto, Helvetica (generic), plain Inter as display (over-used), Montserrat (Brazilian SaaS cliché — every Hotmart page uses it), Poppins (ditto).

**Sizes (mobile / desktop):**
- Display hero: 40px / 72–96px, tracking -0.02em
- H1: 28px / 40px
- H2: 22px / 28px
- Body: 15px / 16px, line-height 1.55
- Caption: 13px / 14px, tracking +0.01em, uppercase acceptable

**Portuguese runs 25–40% longer than English.** Build layouts that absorb this. Buttons must fit "Continuar assistindo", not just "Continue". Never truncate CTAs.

## Motion

Motion is how the member feels progress. Three jobs only:

1. **Orient** — page transitions, route changes. Fast (180–240ms), ease-out, no flourish.
2. **Confirm** — lesson complete, module unlocked, achievement earned. This is where celebration lives. A micro-celebração on completion is the brand moment. Restraint: one second, confident, not Duolingo-childish.
3. **Feedback** — progress bars filling, hover states, press states. Instant (<100ms) or not at all.

**Single easing curve** across the product: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quart) for 90% of cases. Spring for celebrations only.

Framework: **Motion** (ex-Framer Motion) for React. CSS-only for HTML artifacts. Never both in the same project.

## Surface patterns

Each surface has a job. Design to the job; resist adding more.

### Dashboard / Home do membro
- **Job**: in 2 seconds, answer "o que eu faço agora?"
- **Must have**: ONE primary continuation CTA (continue-watching-next-lesson); recent activity; at most 3 secondary paths. Progress state visible but not screaming.
- **Anti-pattern**: grid of all courses as equal tiles (Netflix-style). Members have 1–3 active products, not 80. Treat this like a personal briefing, not a catalog.

### Curso / Hub do produto
- **Job**: show structure, show where I am, let me resume.
- **Must have**: module list with progress per module; clear "próxima aula" anchor; course metadata secondary.
- **Anti-pattern**: disclosure-arrow accordion hell. If there are 40 modules, design the 40-module case *first* — don't design for 3 and hope it scales.

### Player de aula
- **Job**: get out of the way.
- **Must have**: video dominant; minimal chrome; next-lesson CTA; notes/material if applicable; completion action obvious.
- **Anti-pattern**: brand color competing with video. In the player, the brand recedes. Dark ground, low-chroma chrome, brand color *only* on the primary CTA and progress fill.

### Trilha / Progress
- **Job**: show the shape of the journey. Make the next step feel imminent.
- **Must have**: visual journey (timeline, path, or step ladder — pick one shape and commit); current position unambiguous; locked/unlocked state clear.
- **Anti-pattern**: generic progress bar as the whole page. A trilha is a story; a bar is a stat.

### Comunidade
- **Job**: make contribution feel low-friction and high-signal.
- **Must have**: clear composer entry; signal hierarchy (new replies > old threads); identity (who's talking) prominent.
- **Anti-pattern**: Discord-in-a-wrapper. Members are there for the course, not for chat scroll. Design for deliberate contribution, not firehose.

### Perfil / Conquistas
- **Job**: show identity + earned status.
- **Must have**: name/avatar; earned milestones (badges, certificates); streak/progress summary if gamified.
- **Anti-pattern**: corporate settings page. This is the trophy shelf. Design it like one.

### Paywall / Bloqueio de conteúdo
- **Job**: make the unlock feel like a natural next step, not a wall.
- **Must have**: preview of what's behind; clear value; ONE CTA; friction-minimizing checkout handoff.
- **Anti-pattern**: angry locked-state icons. The experience is *invitation*, not *denial*.

### Onboarding / Primeira sessão
- **Job**: ship the member to their first win in under 3 minutes.
- **Must have**: orientation to the ONE thing they should do first; personal welcome (nome do membro, nome do produto); clear "começar agora" path.
- **Anti-pattern**: 7-step tour. Members skip tours. Teach in-context, in the moments that matter.

### Login / Auth
- **Job**: disappear. Friction here is churn before first touch.
- **Must have**: social + email; password recovery obvious; brand presence minimal but premium.
- **Anti-pattern**: marketing-site auth page with hero illustrations and testimonials.

### Certificado / Conclusão
- **Job**: make completion feel like an event.
- **Must have**: celebratory moment (motion, typography, color signal-complete); share/download actions; what's next.
- **Anti-pattern**: PDF download link as the whole reward. This is the brand moment of the entire product — earn it.

## Mobile-first (Brazil is a mobile country)

- Design 375px first, 1440px second. If it doesn't work on 375, it doesn't ship.
- **Thumb zone**: primary actions in the bottom 1/3 of the viewport on mobile. Top-right is for dismissal only.
- **Player controls**: gesture-first on mobile (tap-to-pause, double-tap-to-seek, swipe-down-to-dismiss). Hover states must have a tap equivalent.
- **Data-lean**: assume 4G with spotty quality. Skeleton states must be designed, not auto-generated gray boxes. Defer non-critical assets.
- **Offline posture**: at minimum, already-watched lessons resume from last position without a network roundtrip.

## Portuguese content rules

- **Register**: informal "você" throughout. Never "o usuário", never "o aluno" as a label (it infantilizes). Prefer "membro", "você", "a comunidade".
- **Vocabulary to retire** (Hotmart-genérico signals): "aula liberada", "conteúdo premium desbloqueado", "siga os passos", "cadastre-se agora mesmo". These phrases are a class signal. Rewrite from scratch for your brand.
- **Button verbs**: short, active, present-tense. "Continuar", "Começar", "Assistir agora", "Entrar na comunidade". Avoid "Clique aqui para..." — ever.
- **Empty states**: Brazilian humor works here when it is confident, not pun-heavy. "Sem novidades por aqui ainda" beats "Oops! Nada por aqui 😅".
- **Error copy**: own the problem, offer the next step. "A conexão caiu — tentamos de novo em 3s" not "Erro 502".

## Anti-patterns — the Hotmart-genérico smell test

If your screen has any of these, it looks like every other Brazilian area-de-membros:
- Montserrat or Poppins as display
- Purple→pink gradient CTAs on white
- Rounded-3xl on everything
- Course cards as equal-weight grid with gradient overlays on thumbnails
- "Aula liberada 🎉" toast with emoji
- Checkmark-in-green-circle as the only completion signal
- Certificate rendered in Comic Sans energy (filigree borders, gold seals, center-aligned everything)
- Pastel-pill-per-category navigation
- Progress bar with percentage label as the entire progress story

Kill on sight.

## Starter tokens (drop-in CSS custom properties)

Use this as the *starting point*; customize --brand and pairings per brand system, never ship unmodified.

```css
:root {
  --ground-0: #0a0a0b; --ground-1: #141416; --ground-2: #1d1d21; --ground-3: #28282e;
  --ink-1: #fafafa; --ink-2: #b8b8bf; --ink-3: #7a7a82; --ink-disabled: #4a4a52;

  /* Replace with brand color — ownable, confident, not purple-on-white */
  --brand: #00E676;           
  --brand-ink: #0a0a0b;

  --signal-complete: #00E676;
  --signal-hot: #FF5252;
  --signal-locked: var(--ink-3);

  --r-sm: 6px; --r-md: 12px; --r-lg: 20px; --r-xl: 32px;
  --shadow-raise: 0 1px 2px rgb(0 0 0 / .4), 0 8px 24px rgb(0 0 0 / .3);

  --ease: cubic-bezier(0.22, 1, 0.36, 1);
  --dur-fast: 160ms; --dur: 240ms; --dur-slow: 480ms;

  --font-display: 'Cabinet Grotesk', system-ui, sans-serif;
  --font-body: 'Geist', system-ui, sans-serif;
}

[data-theme="light"] {
  --ground-0: #ffffff; --ground-1: #f7f7f8; --ground-2: #eeeef0; --ground-3: #e4e4e7;
  --ink-1: #0a0a0b; --ink-2: #48484f; --ink-3: #7a7a82; --ink-disabled: #b8b8bf;
}
```

## When implementing

- **Frameworks**: React + Tailwind + Motion is the default. Vanilla HTML/CSS for artifacts and prototypes. Match stack to the ask.
- **Stack hygiene**: one font loader, one icon set (Lucide or Phosphor — pick one per project), one motion library.
- **Accessibility is non-negotiable**: WCAG AA contrast on all text over ground, focus rings visible, keyboard nav complete, prefers-reduced-motion respected (disable celebrations, keep orientation motion).
- **Always produce working code**, not descriptions of code. Production-grade HTML/CSS/JS or React — functional, hover/focus/press states included, skeleton/empty/error states designed not defaulted.

## Remember

The DNA is fixed (Brazilian confidence, bold & disruptive, premium-by-subtraction, dark-first, mobile-first). The specific execution varies per surface and per brand moment. Consistency is in the *posture*, not in repeating the same layout.

The goal, every time: an area-de-membros that no member in Brazil would mistake for Hotmart, Kajabi, or anything else — and that a member could not imagine a cheaper version of.
