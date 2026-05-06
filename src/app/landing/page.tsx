import type { Metadata } from "next";
import { LandingAnimations } from "./landing-animations";
import "./landing.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://mymembersclub.com.br"),
  title: {
    absolute: "Members Club — A Plataforma de Área de Membros Premium",
  },
  description:
    "Plataforma 100% brasileira para criar e gerenciar sua área de membros. 50+ funcionalidades, vitrine Netflix, comunidade, gamificação e checkout — R$ 97/mês.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://mymembersclub.com.br",
    siteName: "Members Club",
    title: "Members Club — A Plataforma de Área de Membros Premium",
    description:
      "Plataforma 100% brasileira para criar e gerenciar sua área de membros.",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Members Club — A Plataforma de Área de Membros Premium",
    description:
      "Plataforma 100% brasileira para criar e gerenciar sua área de membros.",
  },
};

const LANDING_BODY = `
<!-- NAV -->
<nav>
  <div class="nav-inner">
    <a href="#" class="nav-logo">
      <img src="/logo-landing.png" alt="Members Club" height="36" width="36" />
      <span>Members Club</span>
    </a>
    <div class="nav-links">
      <a href="#features" class="nav-link">Recursos</a>
      <a href="#seguranca" class="nav-link">Segurança</a>
      <a href="#plano" class="nav-link">Plano</a>
      <a href="https://app.mymembersclub.com.br/producer/login" class="btn btn-ghost btn-nav">Entrar</a>
      <a href="https://app.mymembersclub.com.br/producer/register" class="btn btn-primary btn-nav">Criar minha conta</a>
    </div>
  </div>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="hero-grid"></div>
  <div class="container hero-content">
    <div class="hero-badge anim-fade-up">
      <span class="hero-badge-dot"></span>
      Plataforma 100% brasileira
    </div>
    <h1 class="anim-fade-up anim-d1">
      A área de membros que seu<br><span class="brand-text">infoproduto merece</span>
    </h1>
    <p class="hero-sub anim-fade-up anim-d2">
      Mais de 50 funcionalidades integradas. Vitrine Netflix, comunidade, gamificação, certificados, automações e checkout — tudo em um só lugar por R$&nbsp;97/mês.
    </p>
    <div class="hero-ctas anim-fade-up anim-d3">
      <a href="https://app.mymembersclub.com.br/producer/register" class="btn btn-primary btn-large">
        Criar minha conta grátis
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12L12 5M12 5H6M12 5v6"/></svg>
      </a>
      <a href="#features" class="btn btn-outline btn-large">Ver recursos</a>
    </div>

    <!-- HERO MOCKUP -->
    <div class="hero-mockup-wrap">
      <div class="hero-mockup">
        <svg viewBox="0 0 1100 620" xmlns="http://www.w3.org/2000/svg" fill="none">
          <rect width="1100" height="620" rx="16" fill="#0c0c14"/>
          <!-- Window chrome -->
          <rect width="1100" height="40" rx="16" fill="#111119"/>
          <rect y="28" width="1100" height="12" fill="#111119"/>
          <circle cx="20" cy="20" r="6" fill="#ff5f57"/>
          <circle cx="40" cy="20" r="6" fill="#febc2e"/>
          <circle cx="60" cy="20" r="6" fill="#28c840"/>
          <!-- Sidebar -->
          <rect y="40" width="220" height="580" fill="#0a0a12"/>
          <rect x="24" y="60" width="36" height="36" rx="10" fill="rgba(59,130,246,0.12)"/>
          <text x="42" y="83" font-family="Outfit,sans-serif" font-size="14" font-weight="700" fill="#3b82f6" text-anchor="middle">M</text>
          <text x="72" y="83" font-family="Outfit,sans-serif" font-size="14" font-weight="600" fill="#f0f0f5">Members Club</text>
          <!-- Nav items -->
          <rect x="16" y="116" width="188" height="38" rx="10" fill="rgba(59,130,246,0.08)"/>
          <rect x="32" y="128" width="14" height="14" rx="3" fill="#3b82f6" opacity="0.5"/>
          <text x="56" y="140" font-family="Plus Jakarta Sans,sans-serif" font-size="13" fill="#3b82f6" font-weight="600">Vitrine</text>
          <rect x="32" y="170" width="14" height="14" rx="3" fill="#5a5a6e" opacity="0.3"/>
          <text x="56" y="182" font-family="Plus Jakarta Sans,sans-serif" font-size="13" fill="#8b8b9e">Cursos</text>
          <rect x="32" y="202" width="14" height="14" rx="3" fill="#5a5a6e" opacity="0.3"/>
          <text x="56" y="214" font-family="Plus Jakarta Sans,sans-serif" font-size="13" fill="#8b8b9e">Comunidade</text>
          <rect x="32" y="234" width="14" height="14" rx="3" fill="#5a5a6e" opacity="0.3"/>
          <text x="56" y="246" font-family="Plus Jakarta Sans,sans-serif" font-size="13" fill="#8b8b9e">Conquistas</text>
          <rect x="32" y="266" width="14" height="14" rx="3" fill="#5a5a6e" opacity="0.3"/>
          <text x="56" y="278" font-family="Plus Jakarta Sans,sans-serif" font-size="13" fill="#8b8b9e">Suporte</text>

          <!-- Hero Banner -->
          <defs>
            <linearGradient id="bg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1a1a2e"/><stop offset="100%" stop-color="#16213e"/></linearGradient>
            <linearGradient id="bo1" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#0c0c14" stop-opacity="0.85"/><stop offset="50%" stop-color="#0c0c14" stop-opacity="0"/></linearGradient>
            <linearGradient id="t1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1e3a5f"/><stop offset="100%" stop-color="#0d1b2a"/></linearGradient>
            <linearGradient id="t2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#2d1b4e"/><stop offset="100%" stop-color="#1a0a2e"/></linearGradient>
            <linearGradient id="t3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1b3d2f"/><stop offset="100%" stop-color="#0a1f15"/></linearGradient>
            <linearGradient id="t4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#3d2a1b"/><stop offset="100%" stop-color="#1f150a"/></linearGradient>
          </defs>
          <rect x="236" y="52" width="848" height="270" rx="14" fill="url(#bg1)"/>
          <rect x="236" y="52" width="848" height="270" rx="14" fill="url(#bo1)"/>
          <circle cx="920" cy="140" r="90" fill="#3b82f6" opacity="0.05"/>
          <circle cx="960" cy="180" r="50" fill="#3b82f6" opacity="0.07"/>
          <text x="272" y="215" font-family="Outfit,sans-serif" font-size="26" font-weight="800" fill="#f0f0f5" letter-spacing="-0.5">Marketing Digital Avançado</text>
          <text x="272" y="240" font-family="Plus Jakarta Sans,sans-serif" font-size="13" fill="#8b8b9e">24 aulas · 8 módulos · Certificado incluso</text>
          <rect x="272" y="256" width="148" height="38" rx="10" fill="#3b82f6"/>
          <text x="310" y="280" font-family="Plus Jakarta Sans,sans-serif" font-size="13" font-weight="600" fill="#fff">▶ Continuar</text>
          <rect x="272" y="304" width="280" height="4" rx="2" fill="rgba(255,255,255,0.08)"/>
          <rect x="272" y="304" width="168" height="4" rx="2" fill="#3b82f6"/>
          <text x="560" y="310" font-family="Plus Jakarta Sans,sans-serif" font-size="10" fill="#8b8b9e">60%</text>

          <!-- Section title -->
          <text x="252" y="358" font-family="Outfit,sans-serif" font-size="16" font-weight="700" fill="#f0f0f5">Continuar assistindo</text>

          <!-- Cards -->
          <rect x="252" y="376" width="192" height="176" rx="12" fill="#181822"/>
          <rect x="252" y="376" width="192" height="98" rx="12" fill="url(#t1)"/>
          <circle cx="348" cy="425" r="16" fill="rgba(0,0,0,0.5)"/><polygon points="343,417 359,425 343,433" fill="#fff"/>
          <text x="264" y="498" font-family="Plus Jakarta Sans,sans-serif" font-size="12" font-weight="600" fill="#f0f0f5">Funil de Vendas</text>
          <text x="264" y="514" font-family="Plus Jakarta Sans,sans-serif" font-size="11" fill="#8b8b9e">Módulo 3 · Aula 7</text>
          <rect x="264" y="526" width="168" height="3" rx="1.5" fill="rgba(255,255,255,0.06)"/>
          <rect x="264" y="526" width="84" height="3" rx="1.5" fill="#3b82f6"/>

          <rect x="460" y="376" width="192" height="176" rx="12" fill="#181822"/>
          <rect x="460" y="376" width="192" height="98" rx="12" fill="url(#t2)"/>
          <circle cx="556" cy="425" r="16" fill="rgba(0,0,0,0.5)"/><polygon points="551,417 567,425 551,433" fill="#fff"/>
          <text x="472" y="498" font-family="Plus Jakarta Sans,sans-serif" font-size="12" font-weight="600" fill="#f0f0f5">Copywriting Pro</text>
          <text x="472" y="514" font-family="Plus Jakarta Sans,sans-serif" font-size="11" fill="#8b8b9e">Módulo 1 · Aula 3</text>
          <rect x="472" y="526" width="168" height="3" rx="1.5" fill="rgba(255,255,255,0.06)"/>
          <rect x="472" y="526" width="38" height="3" rx="1.5" fill="#3b82f6"/>

          <rect x="668" y="376" width="192" height="176" rx="12" fill="#181822"/>
          <rect x="668" y="376" width="192" height="98" rx="12" fill="url(#t3)"/>
          <circle cx="764" cy="425" r="16" fill="rgba(0,0,0,0.5)"/><polygon points="759,417 775,425 759,433" fill="#fff"/>
          <text x="680" y="498" font-family="Plus Jakarta Sans,sans-serif" font-size="12" font-weight="600" fill="#f0f0f5">Tráfego Pago</text>
          <text x="680" y="514" font-family="Plus Jakarta Sans,sans-serif" font-size="11" fill="#8b8b9e">Módulo 5 · Aula 2</text>
          <rect x="680" y="526" width="168" height="3" rx="1.5" fill="rgba(255,255,255,0.06)"/>
          <rect x="680" y="526" width="126" height="3" rx="1.5" fill="#3b82f6"/>

          <rect x="876" y="376" width="192" height="176" rx="12" fill="#181822"/>
          <rect x="876" y="376" width="192" height="98" rx="12" fill="url(#t4)"/>
          <circle cx="972" cy="425" r="16" fill="rgba(0,0,0,0.5)"/><polygon points="967,417 983,425 967,433" fill="#fff"/>
          <text x="888" y="498" font-family="Plus Jakarta Sans,sans-serif" font-size="12" font-weight="600" fill="#f0f0f5">Social Media</text>
          <text x="888" y="514" font-family="Plus Jakarta Sans,sans-serif" font-size="11" fill="#8b8b9e">Módulo 2 · Aula 1</text>
          <rect x="888" y="526" width="168" height="3" rx="1.5" fill="rgba(255,255,255,0.06)"/>
          <rect x="888" y="526" width="14" height="3" rx="1.5" fill="#3b82f6"/>

          <text x="252" y="590" font-family="Outfit,sans-serif" font-size="16" font-weight="700" fill="#f0f0f5">Meus cursos</text>
        </svg>
      </div>
    </div>
  </div>
</section>

<!-- STATS -->
<section class="stats-bar reveal">
  <div class="container">
    <div class="stats-grid">
      <div class="stat-item"><div class="stat-number">50+</div><div class="stat-label">Funcionalidades</div></div>
      <div class="stat-item"><div class="stat-number">∞</div><div class="stat-label">Alunos ilimitados</div></div>
      <div class="stat-item"><div class="stat-number">10</div><div class="stat-label">Workspaces por conta</div></div>
      <div class="stat-item"><div class="stat-number">99.9%</div><div class="stat-label">Uptime garantido</div></div>
    </div>
  </div>
</section>

<!-- FEATURES -->
<section class="features reveal" id="features">
  <div class="container">
    <div class="section-header">
      <div class="section-eyebrow">Recursos</div>
      <h2 class="section-title">Tudo que você precisa.<br>Nada que você não precisa.</h2>
      <p class="section-desc">Uma plataforma completa para criar, vender e escalar seus infoprodutos com experiência premium.</p>
    </div>
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg></div>
        <h3>Vitrine Netflix</h3>
        <p>Banner hero, cards de módulos e "Continuar assistindo". Experiência visual premium para seus alunos.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div>
        <h3>Comunidade</h3>
        <p>Feed com categorias, comentários, curtidas e moderação. Engajamento que retém alunos.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>
        <h3>Gamificação</h3>
        <p>Pontos, 5 níveis e barra de progresso. De Iniciante a Expert com motivação automática.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg></div>
        <h3>Checkout Integrado</h3>
        <p>PIX, cartão e boleto. Webhook automático que libera acesso instantâneo após pagamento.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z"/></svg></div>
        <h3>Automações</h3>
        <p>Gatilhos por matrícula, conclusão ou inatividade. Emails, tags e acessos automaticamente.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg></div>
        <h3>Certificados</h3>
        <p>PDF automático ao concluir 100% com código de verificação único. Ativa por curso.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg></div>
        <h3>Sistema de Lives</h3>
        <p>YouTube ou Zoom com chat ao vivo, moderadores e notificações push automáticas.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>
        <h3>Quizzes</h3>
        <p>Múltipla escolha por aula com nota automática e feedback. Reviews com estrelas.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg></div>
        <h3>Relatórios</h3>
        <p>KPIs de vendas, engajamento e retenção. Exportação CSV com filtros por período.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg></div>
        <h3>PWA — App no Celular</h3>
        <p>Instala como app com ícone na home. Notificações push nativas sem app store.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></div>
        <h3>Personalização Total</h3>
        <p>Cores, logo, banner, temas, menu e slug personalizado. Sua marca, sua cara.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg></div>
        <h3>Colaboradores</h3>
        <p>Convide equipe com permissões granulares. Cada um vê só o que tem acesso.</p>
      </div>
    </div>
  </div>
</section>

<!-- MOCKUP: DASHBOARD -->
<section class="mockup-section" style="background:var(--g1);">
  <div class="container">
    <div class="mockup-row reveal">
      <div class="mockup-text">
        <div class="section-eyebrow">Dashboard</div>
        <h2 class="section-title">Controle total do<br>seu negócio</h2>
        <p class="section-desc">Relatórios em tempo real com KPIs de vendas, engajamento e retenção. Saiba o que está funcionando.</p>
        <ul>
          <li><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Gráficos de receita e ticket médio</li>
          <li><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Aulas mais e menos assistidas</li>
          <li><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Exportação CSV com filtros</li>
        </ul>
      </div>
      <div class="mockup-frame">
        <svg viewBox="0 0 560 400" xmlns="http://www.w3.org/2000/svg" fill="none">
          <rect width="560" height="400" rx="14" fill="#0c0c14"/>
          <rect width="560" height="36" rx="14" fill="#111119"/>
          <rect y="24" width="560" height="12" fill="#111119"/>
          <circle cx="16" cy="18" r="5" fill="#ff5f57"/><circle cx="32" cy="18" r="5" fill="#febc2e"/><circle cx="48" cy="18" r="5" fill="#28c840"/>
          <text x="24" y="68" font-family="Outfit,sans-serif" font-size="18" font-weight="700" fill="#f0f0f5">Dashboard</text>
          <text x="24" y="86" font-family="Plus Jakarta Sans,sans-serif" font-size="11" fill="#8b8b9e">Últimos 30 dias</text>
          <!-- KPIs -->
          <rect x="24" y="100" width="120" height="60" rx="10" fill="#181822"/>
          <text x="36" y="118" font-family="Plus Jakarta Sans,sans-serif" font-size="10" fill="#8b8b9e">Receita</text>
          <text x="36" y="140" font-family="Outfit,sans-serif" font-size="20" font-weight="800" fill="#f0f0f5">R$ 47.2k</text>
          <rect x="156" y="100" width="120" height="60" rx="10" fill="#181822"/>
          <text x="168" y="118" font-family="Plus Jakarta Sans,sans-serif" font-size="10" fill="#8b8b9e">Alunos</text>
          <text x="168" y="140" font-family="Outfit,sans-serif" font-size="20" font-weight="800" fill="#f0f0f5">1.847</text>
          <rect x="288" y="100" width="120" height="60" rx="10" fill="#181822"/>
          <text x="300" y="118" font-family="Plus Jakarta Sans,sans-serif" font-size="10" fill="#8b8b9e">Ticket Médio</text>
          <text x="300" y="140" font-family="Outfit,sans-serif" font-size="20" font-weight="800" fill="#f0f0f5">R$ 297</text>
          <rect x="420" y="100" width="120" height="60" rx="10" fill="#181822"/>
          <text x="432" y="118" font-family="Plus Jakarta Sans,sans-serif" font-size="10" fill="#8b8b9e">Reembolsos</text>
          <text x="432" y="140" font-family="Outfit,sans-serif" font-size="20" font-weight="800" fill="#f0f0f5">2.1%</text>
          <!-- Chart -->
          <rect x="24" y="176" width="340" height="204" rx="12" fill="#181822"/>
          <text x="40" y="200" font-family="Outfit,sans-serif" font-size="13" font-weight="600" fill="#f0f0f5">Receita mensal</text>
          <line x1="60" y1="224" x2="350" y2="224" stroke="rgba(255,255,255,0.04)"/>
          <line x1="60" y1="260" x2="350" y2="260" stroke="rgba(255,255,255,0.04)"/>
          <line x1="60" y1="296" x2="350" y2="296" stroke="rgba(255,255,255,0.04)"/>
          <line x1="60" y1="332" x2="350" y2="332" stroke="rgba(255,255,255,0.04)"/>
          <rect x="75" y="290" width="24" height="54" rx="4" fill="#3b82f6" opacity="0.8"/>
          <rect x="115" y="270" width="24" height="74" rx="4" fill="#3b82f6" opacity="0.85"/>
          <rect x="155" y="254" width="24" height="90" rx="4" fill="#3b82f6" opacity="0.85"/>
          <rect x="195" y="272" width="24" height="72" rx="4" fill="#3b82f6" opacity="0.8"/>
          <rect x="235" y="248" width="24" height="96" rx="4" fill="#3b82f6" opacity="0.9"/>
          <rect x="275" y="230" width="24" height="114" rx="4" fill="#3b82f6" opacity="0.9"/>
          <rect x="315" y="218" width="24" height="126" rx="4" fill="#3b82f6"/>
          <text x="80" y="358" font-family="Plus Jakarta Sans,sans-serif" font-size="9" fill="#5a5a6e">Jan</text>
          <text x="120" y="358" font-family="Plus Jakarta Sans,sans-serif" font-size="9" fill="#5a5a6e">Fev</text>
          <text x="160" y="358" font-family="Plus Jakarta Sans,sans-serif" font-size="9" fill="#5a5a6e">Mar</text>
          <text x="199" y="358" font-family="Plus Jakarta Sans,sans-serif" font-size="9" fill="#5a5a6e">Abr</text>
          <text x="239" y="358" font-family="Plus Jakarta Sans,sans-serif" font-size="9" fill="#5a5a6e">Mai</text>
          <text x="280" y="358" font-family="Plus Jakarta Sans,sans-serif" font-size="9" fill="#5a5a6e">Jun</text>
          <text x="321" y="358" font-family="Plus Jakarta Sans,sans-serif" font-size="9" fill="#5a5a6e">Jul</text>
          <!-- Top courses -->
          <rect x="380" y="176" width="160" height="204" rx="12" fill="#181822"/>
          <text x="394" y="200" font-family="Outfit,sans-serif" font-size="12" font-weight="600" fill="#f0f0f5">Top cursos</text>
          <rect x="394" y="212" width="132" height="34" rx="8" fill="rgba(59,130,246,0.06)"/>
          <text x="406" y="228" font-family="Plus Jakarta Sans,sans-serif" font-size="10" fill="#f0f0f5">Marketing Digital</text>
          <text x="406" y="240" font-family="Plus Jakarta Sans,sans-serif" font-size="9" fill="#3b82f6">342 alunos</text>
          <rect x="394" y="254" width="132" height="34" rx="8" fill="rgba(255,255,255,0.02)"/>
          <text x="406" y="270" font-family="Plus Jakarta Sans,sans-serif" font-size="10" fill="#f0f0f5">Copywriting Pro</text>
          <text x="406" y="282" font-family="Plus Jakarta Sans,sans-serif" font-size="9" fill="#8b8b9e">218 alunos</text>
          <rect x="394" y="296" width="132" height="34" rx="8" fill="rgba(255,255,255,0.02)"/>
          <text x="406" y="312" font-family="Plus Jakarta Sans,sans-serif" font-size="10" fill="#f0f0f5">Tráfego Pago</text>
          <text x="406" y="324" font-family="Plus Jakarta Sans,sans-serif" font-size="9" fill="#8b8b9e">187 alunos</text>
        </svg>
      </div>
    </div>
  </div>
</section>

<!-- MOCKUP: COMUNIDADE -->
<section class="mockup-section">
  <div class="container">
    <div class="mockup-row reverse reveal">
      <div class="mockup-text">
        <div class="section-eyebrow">Comunidade</div>
        <h2 class="section-title">Engajamento que<br>retém alunos</h2>
        <p class="section-desc">Feed de posts com categorias, comentários, curtidas e moderação. Uma comunidade vibrante.</p>
        <ul>
          <li><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Categorias: Dúvida, Resultado, Feedback</li>
          <li><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Upload de imagens e moderação</li>
          <li><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Grupos temáticos dentro do curso</li>
        </ul>
      </div>
      <div class="mockup-frame">
        <svg viewBox="0 0 560 400" xmlns="http://www.w3.org/2000/svg" fill="none">
          <rect width="560" height="400" rx="14" fill="#0c0c14"/>
          <rect width="560" height="36" rx="14" fill="#111119"/>
          <rect y="24" width="560" height="12" fill="#111119"/>
          <circle cx="16" cy="18" r="5" fill="#ff5f57"/><circle cx="32" cy="18" r="5" fill="#febc2e"/><circle cx="48" cy="18" r="5" fill="#28c840"/>
          <text x="24" y="66" font-family="Outfit,sans-serif" font-size="18" font-weight="700" fill="#f0f0f5">Comunidade</text>
          <!-- Tabs -->
          <rect x="24" y="78" width="56" height="26" rx="8" fill="#3b82f6"/>
          <text x="36" y="95" font-family="Plus Jakarta Sans,sans-serif" font-size="11" font-weight="600" fill="#fff">Todos</text>
          <rect x="88" y="78" width="64" height="26" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.06)"/>
          <text x="98" y="95" font-family="Plus Jakarta Sans,sans-serif" font-size="11" fill="#8b8b9e">Dúvidas</text>
          <rect x="160" y="78" width="78" height="26" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.06)"/>
          <text x="170" y="95" font-family="Plus Jakarta Sans,sans-serif" font-size="11" fill="#8b8b9e">Resultados</text>
          <!-- Composer -->
          <rect x="24" y="116" width="512" height="44" rx="12" fill="#181822" stroke="rgba(255,255,255,0.06)"/>
          <circle cx="50" cy="138" r="12" fill="#252536"/>
          <text x="46" y="142" font-family="Plus Jakarta Sans,sans-serif" font-size="9" font-weight="700" fill="#3b82f6">V</text>
          <text x="72" y="142" font-family="Plus Jakarta Sans,sans-serif" font-size="12" fill="#5a5a6e">Compartilhe algo com a comunidade...</text>
          <!-- Post 1 -->
          <rect x="24" y="172" width="512" height="118" rx="14" fill="#181822"/>
          <circle cx="50" cy="200" r="14" fill="#1e3a5f"/>
          <text x="47" y="204" font-family="Plus Jakarta Sans,sans-serif" font-size="10" font-weight="700" fill="#60a5fa">A</text>
          <text x="72" y="196" font-family="Plus Jakarta Sans,sans-serif" font-size="12" font-weight="600" fill="#f0f0f5">Ana Carolina</text>
          <rect x="156" y="186" width="62" height="16" rx="8" fill="rgba(34,197,94,0.1)"/>
          <text x="166" y="198" font-family="Plus Jakarta Sans,sans-serif" font-size="9" font-weight="600" fill="#22c55e">Resultado</text>
          <text x="72" y="212" font-family="Plus Jakarta Sans,sans-serif" font-size="10" fill="#8b8b9e">há 2 horas</text>
          <text x="40" y="240" font-family="Plus Jakarta Sans,sans-serif" font-size="12" fill="#c8c8d4">Apliquei o funil da aula 7 e já fiz 3 vendas hoje!</text>
          <text x="40" y="258" font-family="Plus Jakarta Sans,sans-serif" font-size="12" fill="#c8c8d4">Obrigada pela metodologia, professor! 🚀</text>
          <text x="40" y="280" font-family="Plus Jakarta Sans,sans-serif" font-size="11" fill="#8b8b9e">❤️ 24    💬 8</text>
          <!-- Post 2 -->
          <rect x="24" y="302" width="512" height="84" rx="14" fill="#181822"/>
          <circle cx="50" cy="330" r="14" fill="#2d1b4e"/>
          <text x="47" y="334" font-family="Plus Jakarta Sans,sans-serif" font-size="10" font-weight="700" fill="#a78bfa">R</text>
          <text x="72" y="326" font-family="Plus Jakarta Sans,sans-serif" font-size="12" font-weight="600" fill="#f0f0f5">Rafael Mendes</text>
          <rect x="160" y="316" width="52" height="16" rx="8" fill="rgba(59,130,246,0.1)"/>
          <text x="170" y="328" font-family="Plus Jakarta Sans,sans-serif" font-size="9" font-weight="600" fill="#3b82f6">Dúvida</text>
          <text x="72" y="342" font-family="Plus Jakarta Sans,sans-serif" font-size="10" fill="#8b8b9e">há 4 horas</text>
          <text x="40" y="368" font-family="Plus Jakarta Sans,sans-serif" font-size="12" fill="#c8c8d4">Qual a melhor ferramenta pra criar criativos? Vi no módulo 4...</text>
        </svg>
      </div>
    </div>
  </div>
</section>

<!-- MOCKUP: PERSONALIZAÇÃO -->
<section class="mockup-section" style="background:var(--g1);">
  <div class="container">
    <div class="mockup-row reveal">
      <div class="mockup-text">
        <div class="section-eyebrow">Personalização</div>
        <h2 class="section-title">Sua marca.<br>Sua identidade.</h2>
        <p class="section-desc">Customize cores, logo, banner, layout de login e muito mais. Cada workspace com a cara do seu negócio.</p>
        <ul>
          <li><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Tema claro e escuro</li>
          <li><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Slug personalizado + favicon</li>
          <li><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Menu lateral customizável</li>
        </ul>
      </div>
      <div class="mockup-frame">
        <svg viewBox="0 0 560 380" xmlns="http://www.w3.org/2000/svg" fill="none">
          <rect width="560" height="380" rx="14" fill="#0c0c14"/>
          <rect width="560" height="36" rx="14" fill="#111119"/>
          <rect y="24" width="560" height="12" fill="#111119"/>
          <circle cx="16" cy="18" r="5" fill="#ff5f57"/><circle cx="32" cy="18" r="5" fill="#febc2e"/><circle cx="48" cy="18" r="5" fill="#28c840"/>
          <text x="24" y="66" font-family="Outfit,sans-serif" font-size="18" font-weight="700" fill="#f0f0f5">Personalização</text>
          <text x="24" y="84" font-family="Plus Jakarta Sans,sans-serif" font-size="11" fill="#8b8b9e">Workspace: Marketing Academy</text>
          <!-- Color section -->
          <rect x="24" y="98" width="250" height="260" rx="12" fill="#181822"/>
          <text x="40" y="122" font-family="Outfit,sans-serif" font-size="13" font-weight="600" fill="#f0f0f5">Cores da marca</text>
          <text x="40" y="150" font-family="Plus Jakarta Sans,sans-serif" font-size="11" fill="#8b8b9e">Cor primária</text>
          <rect x="40" y="158" width="218" height="34" rx="8" fill="#111119" stroke="rgba(255,255,255,0.06)"/>
          <rect x="48" y="166" width="18" height="18" rx="6" fill="#3b82f6"/>
          <text x="76" y="180" font-family="Plus Jakarta Sans,sans-serif" font-size="11" fill="#f0f0f5">#3b82f6</text>
          <text x="40" y="212" font-family="Plus Jakarta Sans,sans-serif" font-size="11" fill="#8b8b9e">Background</text>
          <rect x="40" y="220" width="218" height="34" rx="8" fill="#111119" stroke="rgba(255,255,255,0.06)"/>
          <rect x="48" y="228" width="18" height="18" rx="6" fill="#0c0c14" stroke="rgba(255,255,255,0.15)"/>
          <text x="76" y="242" font-family="Plus Jakarta Sans,sans-serif" font-size="11" fill="#f0f0f5">#0c0c14</text>
          <text x="40" y="274" font-family="Plus Jakarta Sans,sans-serif" font-size="11" fill="#8b8b9e">Tema</text>
          <rect x="40" y="282" width="100" height="30" rx="8" fill="#111119"/>
          <rect x="40" y="282" width="52" height="30" rx="8" fill="#3b82f6"/>
          <text x="52" y="301" font-family="Plus Jakarta Sans,sans-serif" font-size="10" font-weight="600" fill="#fff">Dark</text>
          <text x="102" y="301" font-family="Plus Jakarta Sans,sans-serif" font-size="10" fill="#8b8b9e">Light</text>
          <!-- Preview -->
          <rect x="290" y="98" width="250" height="260" rx="12" fill="#181822"/>
          <text x="306" y="122" font-family="Outfit,sans-serif" font-size="13" font-weight="600" fill="#f0f0f5">Preview</text>
          <rect x="306" y="136" width="218" height="130" rx="10" fill="#0c0c14"/>
          <rect x="306" y="136" width="48" height="130" rx="10" fill="#0a0a12"/>
          <rect x="312" y="146" width="36" height="5" rx="2.5" fill="rgba(59,130,246,0.3)"/>
          <rect x="312" y="158" width="36" height="4" rx="2" fill="rgba(255,255,255,0.06)"/>
          <rect x="312" y="168" width="36" height="4" rx="2" fill="rgba(255,255,255,0.06)"/>
          <rect x="362" y="144" width="154" height="46" rx="6" fill="#1a1a2e"/>
          <rect x="370" y="164" width="56" height="6" rx="2" fill="rgba(255,255,255,0.12)"/>
          <rect x="370" y="176" width="36" height="10" rx="4" fill="#3b82f6" opacity="0.7"/>
          <rect x="362" y="198" width="46" height="32" rx="4" fill="#181822"/>
          <rect x="414" y="198" width="46" height="32" rx="4" fill="#181822"/>
          <rect x="466" y="198" width="46" height="32" rx="4" fill="#181822"/>
          <!-- Upload area -->
          <rect x="306" y="280" width="218" height="60" rx="10" fill="#111119" stroke="rgba(255,255,255,0.06)" stroke-dasharray="6 4"/>
          <text x="415" y="306" font-family="Plus Jakarta Sans,sans-serif" font-size="11" fill="#5a5a6e" text-anchor="middle">Arraste sua logo</text>
          <text x="415" y="324" font-family="Plus Jakarta Sans,sans-serif" font-size="10" fill="#3b82f6" text-anchor="middle">Escolher arquivo</text>
        </svg>
      </div>
    </div>
  </div>
</section>

<!-- DIFFERENTIALS -->
<section class="differentials reveal">
  <div class="container">
    <div class="section-header">
      <div class="section-eyebrow">Diferenciais</div>
      <h2 class="section-title">Por que escolher<br>Members Club?</h2>
    </div>
    <div class="diff-grid">
      <div class="diff-card">
        <div class="diff-icon"><svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
        <h3>Segurança de verdade</h3>
        <p>WAF, 2FA, AES-256, RLS em 49 tabelas. Aprovado em pentest profissional.</p>
      </div>
      <div class="diff-card">
        <div class="diff-icon"><svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z"/></svg></div>
        <h3>Automações inteligentes</h3>
        <p>Gatilhos com delays, tags, emails e acessos. Faça mais, trabalhando menos.</p>
      </div>
      <div class="diff-card">
        <div class="diff-icon"><svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg></div>
        <h3>Painel completo</h3>
        <p>Dashboards com KPIs, relatórios e CSV. Dados para decisões com confiança.</p>
      </div>
    </div>
  </div>
</section>

<!-- SECURITY -->
<section class="security reveal" id="seguranca">
  <div class="container">
    <div class="section-header">
      <div class="section-eyebrow">Segurança</div>
      <h2 class="section-title">Infraestrutura de<br>nível enterprise</h2>
      <p class="section-desc">Seus dados e dos seus alunos protegidos com as melhores práticas do mercado.</p>
    </div>
    <div class="security-grid">
      <div class="sec-item">
        <div class="sec-icon"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
        <h4>Cloudflare WAF</h4>
        <p>Firewall de aplicação web avançado</p>
      </div>
      <div class="sec-item">
        <div class="sec-icon"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div>
        <h4>AES-256</h4>
        <p>Dados sensíveis criptografados</p>
      </div>
      <div class="sec-item">
        <div class="sec-icon"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></div>
        <h4>DDoS + DNSSEC</h4>
        <p>Proteção contra ataques distribuídos</p>
      </div>
      <div class="sec-item">
        <div class="sec-icon"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg></div>
        <h4>RLS — 49 tabelas</h4>
        <p>Row Level Security completo</p>
      </div>
      <div class="sec-item">
        <div class="sec-icon"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg></div>
        <h4>2FA</h4>
        <p>Autenticação em dois fatores</p>
      </div>
      <div class="sec-item">
        <div class="sec-icon"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
        <h4>Audit Trail</h4>
        <p>Log de todas as ações admin</p>
      </div>
      <div class="sec-item">
        <div class="sec-icon"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M11 7v4l3 3"/></svg></div>
        <h4>Rate Limiting</h4>
        <p>Controle por IP e por rota</p>
      </div>
      <div class="sec-item">
        <div class="sec-icon"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
        <h4>Pentest Aprovado</h4>
        <p>Teste profissional realizado</p>
      </div>
    </div>
  </div>
</section>

<!-- PRICING -->
<section class="pricing reveal" id="plano">
  <div class="container">
    <div class="section-header">
      <div class="section-eyebrow">Plano</div>
      <h2 class="section-title">Simples. Sem surpresas.</h2>
      <p class="section-desc">Um único plano com tudo incluído. Sem taxa por aluno, sem funcionalidades escondidas.</p>
    </div>
    <div class="pricing-card">
      <span class="pricing-badge">Plano Pro</span>
      <div class="pricing-price">
        <span class="pricing-currency">R$</span>
        <span class="pricing-value">97</span>
      </div>
      <div class="pricing-period">por mês · tudo incluído</div>
      <ul class="pricing-features">
        <li><svg class="check-icon" width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="2.5"><polyline points="13 2 5 10 2 7" transform="translate(1,3)"/></svg>10 workspaces</li>
        <li><svg class="check-icon" width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="2.5"><polyline points="13 2 5 10 2 7" transform="translate(1,3)"/></svg>30 cursos/workspace</li>
        <li><svg class="check-icon" width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="2.5"><polyline points="13 2 5 10 2 7" transform="translate(1,3)"/></svg>Alunos ilimitados</li>
        <li><svg class="check-icon" width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="2.5"><polyline points="13 2 5 10 2 7" transform="translate(1,3)"/></svg>Comunidade</li>
        <li><svg class="check-icon" width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="2.5"><polyline points="13 2 5 10 2 7" transform="translate(1,3)"/></svg>Gamificação</li>
        <li><svg class="check-icon" width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="2.5"><polyline points="13 2 5 10 2 7" transform="translate(1,3)"/></svg>Certificados</li>
        <li><svg class="check-icon" width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="2.5"><polyline points="13 2 5 10 2 7" transform="translate(1,3)"/></svg>Automações</li>
        <li><svg class="check-icon" width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="2.5"><polyline points="13 2 5 10 2 7" transform="translate(1,3)"/></svg>Lives YouTube/Zoom</li>
        <li><svg class="check-icon" width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="2.5"><polyline points="13 2 5 10 2 7" transform="translate(1,3)"/></svg>Checkout integrado</li>
        <li><svg class="check-icon" width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="2.5"><polyline points="13 2 5 10 2 7" transform="translate(1,3)"/></svg>Relatórios avançados</li>
        <li><svg class="check-icon" width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="2.5"><polyline points="13 2 5 10 2 7" transform="translate(1,3)"/></svg>PWA + push</li>
        <li><svg class="check-icon" width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="2.5"><polyline points="13 2 5 10 2 7" transform="translate(1,3)"/></svg>Personalização total</li>
        <li><svg class="check-icon" width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="2.5"><polyline points="13 2 5 10 2 7" transform="translate(1,3)"/></svg>Colaboradores</li>
        <li><svg class="check-icon" width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="2.5"><polyline points="13 2 5 10 2 7" transform="translate(1,3)"/></svg>Suporte + tickets</li>
        <li><svg class="check-icon" width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="2.5"><polyline points="13 2 5 10 2 7" transform="translate(1,3)"/></svg>Quizzes</li>
        <li><svg class="check-icon" width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="2.5"><polyline points="13 2 5 10 2 7" transform="translate(1,3)"/></svg>Segurança enterprise</li>
      </ul>
      <a href="https://app.mymembersclub.com.br/producer/register" class="btn btn-primary btn-large pricing-cta">
        Criar minha conta agora
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12L12 5M12 5H6M12 5v6"/></svg>
      </a>
    </div>
  </div>
</section>

<!-- CTA FINAL -->
<section class="final-cta reveal">
  <div class="container">
    <h2>Pronto para criar algo<br><span class="brand-text">extraordinário</span>?</h2>
    <p>Comece agora e tenha a área de membros mais completa do Brasil em minutos.</p>
    <a href="https://app.mymembersclub.com.br/producer/register" class="btn btn-primary btn-large">
      Criar minha conta grátis
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12L12 5M12 5H6M12 5v6"/></svg>
    </a>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="container">
    <div class="footer-inner">
      <div class="footer-brand">
        <img src="/logo-landing.png" alt="Members Club" height="32" width="32" style="opacity: 0.7;" />
        <span>Members Club</span>
      </div>
      <div class="footer-links">
        <a href="https://app.mymembersclub.com.br/producer/login">Entrar</a>
        <a href="https://app.mymembersclub.com.br/producer/register">Criar conta</a>
        <a href="https://mymembersclub.com.br">mymembersclub.com.br</a>
      </div>
      <div class="footer-copy">&copy; 2026 Members Club. Todos os direitos reservados.</div>
    </div>
  </div>
</footer>
`;

export default function LandingPage() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <div dangerouslySetInnerHTML={{ __html: LANDING_BODY }} />
      <LandingAnimations />
    </>
  );
}
