'use client';

import { useEffect } from 'react';
import {
  VitrineMockup,
  DashboardMockup,
  CommunityMockup,
  BrandingMockup,
} from '@/components/landing-mockups';

const IMAGES = {
  logo: '/logo-landing.png',
};

// ───────────────── LINKS ─────────────────
const URLS = {
  register: 'https://app.mymembersclub.com.br/producer/register',
  login: 'https://app.mymembersclub.com.br/producer/login',
};

// ───────────────── ICONS ─────────────────
const Ic = {
  arrow: (p: React.SVGProps<SVGSVGElement>) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>
  ),
  check: (p: React.SVGProps<SVGSVGElement>) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 13l4 4L19 7"/></svg>
  ),
  play: (p: React.SVGProps<SVGSVGElement>) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M7 4l14 8-14 8z"/></svg>
  ),
  star: (p: React.SVGProps<SVGSVGElement>) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2l3 7h7l-5.5 4.5L18 22l-6-4-6 4 1.5-8.5L2 9h7z"/></svg>
  ),
  shield: (p: React.SVGProps<SVGSVGElement>) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 2l8 3v6c0 5-4 9-8 11-4-2-8-6-8-11V5z"/><path d="M9 12l2 2 4-4"/></svg>
  ),
  bolt: (p: React.SVGProps<SVGSVGElement>) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13 2L3 14h7l-1 8 10-12h-7z"/></svg>
  ),
  chart: (p: React.SVGProps<SVGSVGElement>) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 3v18h18M7 14l4-4 4 4 5-6"/></svg>
  ),
};

// ───────────────── REVEAL ON SCROLL ─────────────────
function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('mc-visible')),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.mc-reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ───────────────── COMPONENT ─────────────────
export default function MembersClubLanding() {
  useReveal();

  return (
    <div className="mc-root min-h-screen bg-[var(--mc-g0)] text-[var(--mc-ink1)] font-body overflow-x-hidden" data-aesthetic="cine">
      <McStyles />
      <Nav />
      <Hero />
      <Stats />
      <Marquee />
      <Vitrine />
      <Dashboard />
      <Community />
      <Branding />
      <Features />
      <Differentials />
      <Security />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}

// ───────────────── NAV ─────────────────
function Nav() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 backdrop-blur-xl bg-[var(--mc-g0)]/80 border-b border-white/[0.06]">
      <div className="max-w-[1240px] mx-auto px-8 h-[76px] flex items-center justify-between">
        <a href="#" className="flex items-center gap-3 text-white">
          <img src={IMAGES.logo} alt="Members Club" className="w-9 h-9 object-contain drop-shadow-[0_0_14px_var(--mc-accent-glow)]"/>
          <span className="font-display font-bold text-[19px] tracking-tight">Members Club</span>
        </a>
        <div className="hidden md:flex items-center gap-1">
          {[['Plataforma','#vitrine'],['Recursos','#features'],['Segurança','#seguranca'],['Planos','#planos'],['FAQ','#faq']].map(([l,h]) => (
            <a key={h} href={h} className="text-sm font-medium text-[var(--mc-ink2)] hover:text-white hover:bg-white/[0.04] px-3.5 py-2 rounded-[10px] transition">{l}</a>
          ))}
          <a href={URLS.login} className="text-sm font-semibold px-4 py-2 rounded-[10px] bg-white/[0.06] hover:bg-white/[0.10] text-white">Entrar</a>
          <a href={URLS.register} className="mc-btn-primary text-sm px-4 py-2">Criar conta</a>
        </div>
      </div>
    </nav>
  );
}

// ───────────────── HERO ─────────────────
function Hero() {
  return (
    <section className="relative pt-44 md:pt-[180px] pb-24 md:pb-[120px] overflow-hidden isolate">
      {/* glow */}
      <div className="absolute left-1/2 -top-[200px] -translate-x-1/2 w-[1100px] h-[1100px] -z-10 mc-drift"
           style={{ background: 'radial-gradient(circle, var(--mc-accent-soft) 0%, transparent 60%)', filter: 'blur(20px)' }}/>
      {/* grid */}
      <div className="absolute inset-0 -z-10 opacity-100"
           style={{
             backgroundImage: 'linear-gradient(rgba(255,255,255,.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.022) 1px, transparent 1px)',
             backgroundSize: '64px 64px',
             WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at center, black 20%, transparent 75%)',
             maskImage: 'radial-gradient(ellipse 60% 50% at center, black 20%, transparent 75%)',
           }}/>
      <div className="max-w-[1240px] mx-auto px-8 text-center relative z-10">
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-[var(--mc-accent-soft)] border border-[var(--mc-accent-ring)] rounded-full text-xs sm:text-[13px] font-medium text-[var(--mc-accent)] mb-9">
          <span className="w-[7px] h-[7px] rounded-full bg-[var(--mc-accent)] shadow-[0_0_12px_var(--mc-accent-glow)] mc-pulse"/>
          A área de membros nº1 do Brasil
        </div>
        <h1 className="font-display font-extrabold leading-[1.05] tracking-[-0.04em] text-balance text-[clamp(36px,5.4vw,72px)] max-w-[1000px] mx-auto mb-6">
          A área de membros <span className="mc-text-gradient">Nº1 do Brasil</span>
          <br/>
          para quem leva infoproduto <span className="font-serif italic font-normal tracking-tight">a sério</span>
        </h1>
        <div className="max-w-[720px] mx-auto mb-11 flex flex-col items-center gap-[18px] text-[clamp(17px,1.6vw,22px)] text-[var(--mc-ink2)] leading-[1.55]">
          <span>Área de Membros Premium com Vitrine Netflix 100% personalizável.</span>
          <span className="mc-sub-zero inline-flex items-center gap-2.5 px-5 py-3 rounded-full font-display font-semibold text-[clamp(18px,1.9vw,26px)] tracking-tight text-white relative">
            Mensalidade <span className="mc-zero-glow">ZERO</span> usando nosso checkout!
          </span>
        </div>
        <div className="flex gap-3.5 justify-center flex-wrap">
          <a href={URLS.register} className="mc-btn-primary mc-btn-lg">Saiba mais <Ic.arrow/></a>
          <a href="#vitrine" className="mc-btn-outline mc-btn-lg"><Ic.play/> Ver a plataforma</a>
        </div>
        <div className="flex gap-6 justify-center flex-wrap mt-7 text-[13px] text-[var(--mc-ink3)]">
          {['App próprio','Comunidade','Automações','Lives'].map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5"><Ic.check className="text-[var(--mc-accent)]"/>{s}</span>
          ))}
        </div>
        <div className="mt-20 max-w-[1300px] mx-auto relative" style={{ perspective: '2000px' }}>
          <div className="rounded-3xl overflow-hidden bg-[var(--mc-g1)] border border-white/[0.10] shadow-[0_60px_120px_-40px_rgba(0,0,0,.6),0_0_160px_var(--mc-accent-soft)]"
               style={{ transform: 'rotateX(2deg)' }}>
            <VitrineMockup/>
          </div>
        </div>
      </div>
    </section>
  );
}

// ───────────────── STATS ─────────────────
function Stats() {
  const stats = [['50+','Funcionalidades'],['∞','Alunos ilimitados'],['10','Workspaces / conta'],['99.9%','Uptime garantido'],['AES-256','Criptografia']];
  return (
    <section className="py-14 border-y border-white/[0.06] bg-[var(--mc-g1)]">
      <div className="max-w-[1240px] mx-auto px-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
        {stats.map(([n,l]) => (
          <div key={l} className="text-center">
            <div className="font-display font-extrabold tracking-[-0.04em] leading-none text-[clamp(32px,4vw,52px)] mc-text-gradient">{n}</div>
            <div className="text-[13px] text-[var(--mc-ink2)] mt-2 font-medium">{l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ───────────────── MARQUEE ─────────────────
function Marquee() {
  const items = ['Coaches','Mentorias','Cursos online','Comunidades pagas','Infoprodutores','Educadores digitais','Trading','Marketing','Saúde & Performance'];
  return (
    <div className="overflow-hidden py-7 border-y border-white/[0.06] bg-[var(--mc-g1)]"
         style={{ WebkitMaskImage: 'linear-gradient(90deg, transparent, black 10%, black 90%, transparent)', maskImage: 'linear-gradient(90deg, transparent, black 10%, black 90%, transparent)' }}>
      <div className="flex gap-16 items-center w-max mc-marquee">
        {[...items, ...items, ...items].map((it, i) => (
          <span key={i} className="font-display font-semibold text-[22px] text-[var(--mc-ink2)] tracking-tight whitespace-nowrap inline-flex items-center gap-3">
            <span className="w-[5px] h-[5px] rounded-full bg-[var(--mc-accent)]"/>{it}
          </span>
        ))}
      </div>
    </div>
  );
}

// ───────────────── ROW (helper) ─────────────────
function Row({ reverse, eyebrow, title, desc, bullets, mockup }: { reverse?: boolean; eyebrow: string; title: React.ReactNode; desc: string; bullets: {h:string;t:string}[]; mockup: React.ReactNode }) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-12 lg:gap-20 items-center ${reverse ? 'lg:[&>:first-child]:order-2' : ''}`}>
      <div className="mc-reveal">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mc-sec-title">{title}</h2>
        <p className="mc-sec-desc !mx-0">{desc}</p>
        <ul className="mt-7 flex flex-col gap-3.5">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3 text-base leading-snug">
              <Ic.check className="flex-shrink-0 mt-1 text-[var(--mc-accent)]"/>
              <span><strong className="font-semibold text-white">{b.h}</strong> <span className="text-[var(--mc-ink2)]">— {b.t}</span></span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mc-reveal rounded-[22px] overflow-hidden bg-[var(--mc-g2)] border border-white/[0.10] shadow-[0_30px_80px_-20px_rgba(0,0,0,.5),0_0_100px_var(--mc-accent-soft)] relative">
        {mockup}
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.14em] text-[var(--mc-accent)] mb-4">
      <span className="w-6 h-px bg-[var(--mc-accent)]"/>{children}
    </div>
  );
}

// ───────────────── SECTIONS ─────────────────
function Vitrine() {
  return (
    <section id="vitrine" className="py-[120px]">
      <div className="max-w-[1240px] mx-auto px-8">
        <Row eyebrow="Experiência do aluno"
          title={<>Seu curso com cara de <span className="font-serif italic font-normal">Netflix</span></>}
          desc="Unifique seu conteúdo em uma vitrine imersiva com banner hero, cards de módulos, 'Continuar assistindo' e progresso automático. Seu aluno entende o caminho sem pensar — o design familiar gera confiança e a sensação de conquista."
          bullets={[
            { h: 'Banner hero cinematográfico', t: 'call-to-action por módulo, capa em movimento' },
            { h: '"Continuar assistindo"', t: 'lembra exatamente onde o aluno parou' },
            { h: 'Barras de progresso', t: 'por aula, módulo e curso' },
            { h: 'Cards modulares', t: 'que se adaptam a qualquer formato de conteúdo' }]}
          mockup={<VitrineMockup/>}/>
      </div>
    </section>
  );
}

function Dashboard() {
  return (
    <section className="py-[120px] bg-[var(--mc-g1)]">
      <div className="max-w-[1240px] mx-auto px-8">
        <Row reverse eyebrow="Relatórios"
          title={<>Decisões por dados,<br/>não por <span className="font-serif italic font-normal">achismo</span></>}
          desc="Acompanhe receita, ticket médio, engajamento, aulas mais assistidas e alunos inativos. Tudo em tempo real com exportação CSV e filtros por período."
          bullets={[
            { h: 'Receita em tempo real', t: 'comparativo por período, ticket médio, churn' },
            { h: 'Engajamento por aluno', t: 'aulas, posts, comentários e lives' },
            { h: 'Ranking de cursos', t: 'mais assistidos e mais abandonados' },
            { h: 'Exportação CSV', t: 'ilimitada com filtros granulares' }]}
          mockup={<DashboardMockup/>}/>
      </div>
    </section>
  );
}

function Community() {
  return (
    <section className="py-[120px]">
      <div className="max-w-[1240px] mx-auto px-8">
        <Row eyebrow="Comunidade"
          title={<>Construa uma <span className="font-serif italic font-normal">legião de fãs</span><br/>ao redor do seu curso</>}
          desc="Crie um ambiente onde a interação acontece naturalmente. Posts por categoria, comentários, curtidas e moderação. Seus alunos compartilhando resultados, tirando dúvidas e se sentindo parte de algo maior."
          bullets={[
            { h: 'Posts categorizados', t: 'fixados, moderados e com mídia rica' },
            { h: 'Curtidas, comentários e mentions', t: 'com notificação push em tempo real' },
            { h: 'Sua comunidade', t: 'sem grupo de WhatsApp, sem Discord, sem dispersão' },
            { h: 'Lives integradas', t: 'YouTube ou Zoom direto no feed' }]}
          mockup={<CommunityMockup/>}/>
      </div>
    </section>
  );
}

function Branding() {
  return (
    <section className="py-[120px] bg-[var(--mc-g1)]">
      <div className="max-w-[1240px] mx-auto px-8">
        <Row reverse eyebrow="White-label"
          title={<>Uma plataforma com a <span className="font-serif italic font-normal">sua cara</span>,<br/>não com a nossa</>}
          desc="Cores, logo, favicon, banner, layout de login, tema claro/escuro e slug personalizado. Seu aluno nunca vai saber que é Members Club — ele vai achar que é 100% sua."
          bullets={[
            { h: 'Domínio próprio (CNAME)', t: 'curso.suamarca.com.br com SSL automático' },
            { h: 'Color picker e tema', t: 'claro / escuro / auto, com preview ao vivo' },
            { h: 'Logo, favicon e banner', t: 'em alta resolução, sem marca d\'água' },
            { h: 'Slug e nomenclatura', t: 'editáveis em todas as telas' }]}
          mockup={<BrandingMockup/>}/>
      </div>
    </section>
  );
}

const FEATURES: [string, string][] = [
  ['Vitrine Netflix', 'Banner hero, cards de módulos e "Continuar assistindo". Experiência visual que faz seu aluno querer voltar.'],
  ['Comunidade Integrada', 'Sua própria rede social dentro da área de membros. Posts, curtidas, categorias e moderação.'],
  ['Gamificação', 'Pontos, níveis, ranking. Seus alunos competindo de forma saudável em busca do 1º lugar.'],
  ['Mensalidade ZERO', 'Use o checkout Applyfy e pague R$ 0 de mensalidade. Plataforma completa sem custo fixo.'],
  ['Automações', 'Gatilhos inteligentes que trabalham por você. Emails, tags e acessos no piloto automático.'],
  ['Certificados', 'PDF automático com código de verificação. Credibilidade que eleva o valor percebido do curso.'],
  ['Sistema de Lives', 'YouTube ou Zoom com chat ao vivo e push. Seus alunos notificados automaticamente.'],
  ['Quizzes', 'Avaliações por aula com nota automática. Engajamento que consolida o aprendizado.'],
  ['Relatórios', 'KPIs de vendas, engajamento e retenção. Decisões por dados, não por achismo.'],
  ['PWA — App no celular', 'Ícone na home, push nativas. Seu curso no bolso do aluno sem precisar de app store.'],
  ['Personalização Total', 'Cores, logo, temas, slug. Uma plataforma com a cara da sua marca, não da nossa.'],
  ['Colaboradores', 'Convide sua equipe com permissões granulares. Cada um vê só o que precisa.'],
];

function Features() {
  return (
    <section id="features" className="py-[120px]">
      <div className="max-w-[1240px] mx-auto px-8">
        <SecHead eyebrow="50+ funcionalidades"
          title={<>Tudo que você precisa para<br/><span className="font-serif italic font-normal">liderar o seu nicho</span></>}
          desc="Cada funcionalidade foi pensada para elevar a percepção de valor do seu produto e transformar a maneira como seus alunos consomem conteúdo."/>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(([h, t], i) => (
            <div key={i} className="mc-reveal mc-fcard">
              <div className="font-display text-xs text-[var(--mc-accent)] font-semibold tracking-[0.12em] mb-4">{String(i + 1).padStart(2, '0')}</div>
              <h3 className="font-display text-[22px] font-bold tracking-tight leading-tight mb-2.5">{h}</h3>
              <p className="text-[14.5px] text-[var(--mc-ink2)] leading-relaxed">{t}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Differentials() {
  const items = [
    { ic: <Ic.shield/>, h: 'Segurança de verdade', t: 'WAF, 2FA, AES-256, RLS em 49 tabelas e pentest aprovado. Seus dados e dos seus alunos blindados — não como detalhe, como fundação.' },
    { ic: <Ic.bolt/>, h: 'Automações que trabalham por você', t: 'Gatilhos inteligentes com delays, tags, emails e liberação de acessos. Faça mais trabalhando menos, no piloto automático.' },
    { ic: <Ic.chart/>, h: 'Painel que te dá controle', t: 'KPIs de vendas, engajamento e retenção. Exportação CSV, filtros granulares. Você sabe exatamente o que está funcionando.' },
  ];
  return (
    <section className="py-[120px] bg-[var(--mc-g1)]">
      <div className="max-w-[1240px] mx-auto px-8">
        <SecHead eyebrow="Por que Members Club"
          title={<>Por que os produtores que <span className="font-serif italic font-normal">lideram</span> seus nichos<br/>escolhem Members Club</>}/>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((d, i) => (
            <div key={i} className="mc-reveal relative overflow-hidden rounded-[22px] p-10 border border-white/[0.06] bg-gradient-to-br from-[var(--mc-g2)] to-[var(--mc-g3)] hover:border-[var(--mc-accent-ring)] hover:-translate-y-1 transition">
              <div className="absolute inset-[-1px] pointer-events-none"
                   style={{ background: 'radial-gradient(circle at top right, var(--mc-accent-soft), transparent 50%)' }}/>
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-[var(--mc-accent-soft)] border border-[var(--mc-accent-ring)] grid place-items-center text-[var(--mc-accent)] mb-6">{d.ic}</div>
                <h3 className="font-display text-[22px] font-bold tracking-tight mb-3">{d.h}</h3>
                <p className="text-[15px] text-[var(--mc-ink2)] leading-relaxed">{d.t}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Security() {
  const items = [
    ['Cloudflare WAF','Filtragem de tráfego em borda global'],
    ['AES-256','Criptografia em repouso e em trânsito'],
    ['DDoS + DNSSEC','Mitigação automática 24/7'],
    ['RLS em 49 tabelas','Isolamento por linha no banco'],
    ['2FA (TOTP)','Para você, sua equipe e seus alunos'],
    ['Audit Trail','Registro imutável de cada ação'],
    ['Rate Limiting','Proteção contra abuso e bots'],
    ['Pentest aprovado','Auditoria externa independente'],
  ];
  return (
    <section id="seguranca" className="py-[120px]">
      <div className="max-w-[1240px] mx-auto px-8">
        <SecHead eyebrow="Infraestrutura"
          title={<>Segurança de nível <span className="font-serif italic font-normal">enterprise</span></>}
          desc="Enquanto outras plataformas tratam segurança como detalhe, nós tratamos como fundação. Seus dados e os dos seus alunos, blindados."/>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {items.map(([h,t], i) => (
            <div key={i} className="mc-reveal bg-[var(--mc-g2)] border border-white/[0.06] rounded-[14px] p-6 flex flex-col gap-2.5 hover:border-[var(--mc-accent-ring)] transition">
              <div className="w-[38px] h-[38px] rounded-[10px] bg-[var(--mc-accent-soft)] grid place-items-center text-[var(--mc-accent)]"><Ic.shield/></div>
              <h4 className="font-display text-[15px] font-bold">{h}</h4>
              <p className="text-[13px] text-[var(--mc-ink3)] leading-snug">{t}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    { q: 'Em 30 dias na Members Club, minha taxa de conclusão saiu de 28% para 71%. O simples fato do curso parecer profissional mudou como o aluno consome.', n: 'Mariana S.', r: 'Mentoria Beleza Digital · 1.2k alunas', i: 'M' },
    { q: 'Saí de três ferramentas separadas para uma. Comunidade, vitrine, automação e checkout no mesmo lugar — economizei R$ 1.4k/mês e ganhei tempo.', n: 'Rodrigo L.', r: 'Curso Trader Profissional · 3.8k alunos', i: 'R' },
    { q: 'Os alunos comentam que parece "uma plataforma de bilhão". Esse é exatamente o sentimento que eu queria que o produto transmitisse.', n: 'Ana Paula F.', r: 'Imersão Confeitaria · 2.1k alunas', i: 'A' },
  ];
  return (
    <section className="py-[120px] bg-[var(--mc-g1)]">
      <div className="max-w-[1240px] mx-auto px-8">
        <SecHead eyebrow="Quem já está dentro"
          title={<>Produtores que <span className="font-serif italic font-normal">já elevaram</span><br/>o nível do que entregam</>}/>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((t, i) => (
            <div key={i} className="mc-reveal bg-[var(--mc-g2)] border border-white/[0.06] rounded-[20px] p-8 flex flex-col gap-6">
              <div className="flex gap-0.5 text-[var(--mc-accent)]">{[0,1,2,3,4].map((s) => <Ic.star key={s}/>)}</div>
              <div className="font-display text-[18px] font-medium leading-snug tracking-tight">&quot;{t.q}&quot;</div>
              <div className="flex items-center gap-3 mt-auto">
                <div className="w-[42px] h-[42px] rounded-full grid place-items-center font-display font-bold text-sm text-[var(--mc-accent)] border border-[var(--mc-accent-ring)]"
                     style={{ background: 'linear-gradient(135deg, var(--mc-accent-soft), var(--mc-accent-ring))' }}>{t.i}</div>
                <div>
                  <div className="text-sm font-semibold">{t.n}</div>
                  <div className="text-xs text-[var(--mc-ink2)]">{t.r}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const PRICING_FEATURES = [
  'Alunos ilimitados','10 workspaces','Vitrine Netflix','Comunidade integrada',
  'Gamificação','Certificados PDF','Automações','Lives integradas',
  'Quizzes','Relatórios completos','PWA','White-label total',
  'Domínio próprio','Suporte prioritário','Audit trail','Backups diários',
];

function Pricing() {
  return (
    <section id="planos" className="py-[120px]">
      <div className="max-w-[1240px] mx-auto px-8">
        <SecHead eyebrow="Planos"
          title={<>Dois caminhos. <span className="font-serif italic font-normal">Sem taxa por aluno.</span><br/>Sem letra miúda.</>}
          desc={<>Use nosso checkout (Applyfy) e tenha a área de membros completa com <strong className="text-white font-semibold">mensalidade zero</strong>. Ou prefira mensalidade fixa, sem comissão de venda. Você escolhe e em ambos é tudo incluído.</>}/>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 max-w-[1100px] mx-auto">
          <PriceCard featured title="Members Club + Applyfy"
            badge="★ Mais escolhido · Mensalidade ZERO"
            desc={<>Plataforma completa <em>de graça</em> usando nosso gateway de pagamento. Você só paga a taxa do checkout — zero mensalidade.</>}
            value="0" period="/mês · usando o checkout Applyfy"
            cta="primary" fine="Ideal para quem está começando ou já vende com Applyfy."
            href="https://wa.me/5531973107233?text=Ol%C3%A1%2C%20tudo%20bem%3F%20Quero%20saber%20mais%20sobre%20a%20%C3%A1rea%20de%20membros%20com%20mensalidade%20zero%20usando%20o%20checkout%20Applyfy."/>
          <PriceCard title="Members Club Pro"
            badge="Plano Pro · Mensalidade fixa"
            desc="Prefere usar seu próprio gateway? Mensalidade fixa, zero comissão sobre venda. Para quem já tem volume e quer máximo controle."
            value="597" period="/mês · alunos ilimitados"
            cta="outline" fine="Use qualquer gateway: Hotmart, Eduzz, Kiwify, Stripe, etc."
            href="https://wa.me/5531973107233?text=Ol%C3%A1%2C%20tudo%20bem%3F%20Quero%20saber%20mais%20sobre%20o%20plano%20Pro%20de%20R%24%20597%2Fm%C3%AAs%20da%20%C3%A1rea%20de%20membros."/>
        </div>
      </div>
    </section>
  );
}

function PriceCard({ featured, title, badge, desc, value, period, cta, fine, href }: { featured?: boolean; title: string; badge: string; desc: React.ReactNode; value: string; period: string; cta: 'primary'|'outline'; fine: string; href: string }) {
  return (
    <div className={`mc-reveal relative overflow-hidden rounded-[28px] p-12 border ${featured ? 'border-[var(--mc-accent)] shadow-[0_0_140px_var(--mc-accent-soft),0_0_0_1px_var(--mc-accent)_inset]' : 'border-[var(--mc-accent-ring)] shadow-[0_0_100px_var(--mc-accent-soft)]'}`}
         style={{ background: featured ? 'linear-gradient(180deg, color-mix(in oklab, var(--mc-accent) 18%, var(--mc-g2)), var(--mc-g2))' : 'var(--mc-g2)' }}>
      <div className="absolute top-0 inset-x-0 h-0.5" style={{ background: 'linear-gradient(90deg, transparent, var(--mc-accent), transparent)' }}/>
      <div className={`inline-flex px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.14em] mb-7 ${featured ? 'bg-[var(--mc-accent)] text-white' : 'bg-[var(--mc-accent-soft)] border border-[var(--mc-accent-ring)] text-[var(--mc-accent)]'}`}>{badge}</div>
      <div className="font-display text-[28px] font-bold tracking-tight mb-2">{title}</div>
      <div className="text-[15px] text-[var(--mc-ink2)] mb-7">{desc}</div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-2xl font-semibold text-[var(--mc-ink2)]">R$</span>
        <span className="font-display font-black tracking-[-0.05em] leading-none text-[88px] mc-text-gradient">{value}</span>
      </div>
      <div className="text-lg text-[var(--mc-ink2)] mb-9">{period}</div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 list-none mb-9">
        {PRICING_FEATURES.map((f, i) => (
          <li key={i} className="flex items-center gap-2.5 text-sm"><Ic.check className="flex-shrink-0 text-[var(--mc-accent)]"/>{f}</li>
        ))}
      </ul>
      <a href={href} target="_blank" rel="noopener noreferrer" className={`${cta === 'primary' ? 'mc-btn-primary' : 'mc-btn-outline'} mc-btn-lg w-full justify-center`}>
        Fale conosco <Ic.arrow/>
      </a>
      <div className="mt-4 text-[13px] text-[var(--mc-ink2)] text-center italic">{fine}</div>
    </div>
  );
}

const FAQS: [string, string][] = [
  ['Posso cancelar quando quiser?', 'Sim. Sem multas, sem fidelidade. Cancele com 1 clique direto no painel.'],
  ['Existe taxa por aluno ou por venda?', 'Não. Usando o checkout Applyfy, a mensalidade é zero. Se preferir usar outros gateways a mensalidade fixa (R$ 597/mês), é zero comissão de venda e alunos ilimitados.'],
  ['Posso usar meu próprio domínio?', 'Sim. Configure um CNAME e seu aluno acessa por curso.suamarca.com.br com SSL automático.'],
  ['E se eu já tenho conteúdo em outra plataforma?', 'A migração é simples e nosso time ajuda. Importação de alunos por CSV e upload em massa de aulas — sem retrabalho.'],
  ['Tem app no celular?', 'PWA com ícone na home, push nativas e funcionamento offline. Sem App Store, sem aprovação, sem fricção.'],
  ['E os meus dados?', 'AES-256 em repouso e em trânsito, backups diários, 2FA opcional para você e seus alunos. Pentest externo aprovado.'],
  ['Posso testar antes?', 'Conta grátis para configurar tudo. Cobramos só quando você decidir publicar para os seus alunos.'],
];

function FAQ() {
  return (
    <section id="faq" className="py-[120px] bg-[var(--mc-g1)]">
      <div className="max-w-[1240px] mx-auto px-8">
        <SecHead eyebrow="FAQ" title={<>Perguntas que <span className="font-serif italic font-normal">todo produtor</span> faz</>}/>
        <div className="max-w-[820px] mx-auto flex flex-col gap-2">
          {FAQS.map(([q, a], i) => (
            <details key={i} open={i === 0} className="mc-reveal group bg-[var(--mc-g2)] border border-white/[0.06] rounded-2xl overflow-hidden open:border-[var(--mc-accent-ring)] transition">
              <summary className="flex items-center justify-between px-6 py-5 font-display text-[17px] font-semibold tracking-tight cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                {q}
                <span className="text-2xl text-[var(--mc-accent)] font-light transition group-open:rotate-45">+</span>
              </summary>
              <div className="px-6 pb-6 text-[15px] text-[var(--mc-ink2)] leading-relaxed">{a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-[120px] text-center relative overflow-hidden">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[1100px] mc-drift z-0"
           style={{ background: 'radial-gradient(circle, var(--mc-accent-soft) 0%, transparent 60%)', filter: 'blur(20px)' }}/>
      <div className="relative z-10 max-w-[1240px] mx-auto px-8">
        <h2 className="mc-reveal font-display font-extrabold tracking-[-0.045em] leading-[1.05] text-balance text-[clamp(42px,6vw,84px)] max-w-[900px] mx-auto mb-6">
          Pronto para elevar o<br/>nível do seu <span className="font-serif italic font-normal">infoproduto?</span>
        </h2>
        <p className="mc-reveal text-[19px] text-[var(--mc-ink2)] max-w-[600px] mx-auto mb-10 leading-relaxed">
          Cause uma primeira impressão inesquecível. Proporcione uma experiência que seus alunos não vão encontrar em nenhum outro lugar.
        </p>
        <div className="mc-reveal flex gap-3.5 justify-center flex-wrap">
          <a href={URLS.register} className="mc-btn-primary mc-btn-lg">Criar minha conta grátis <Ic.arrow/></a>
          <a href="#" className="mc-btn-outline mc-btn-lg">Agendar demonstração</a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="pt-16 pb-10 border-t border-white/[0.06] bg-[var(--mc-g1)]">
      <div className="max-w-[1240px] mx-auto px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-12 pb-12 border-b border-white/[0.06]">
          <div>
            <a href="#" className="flex items-center gap-3 text-white">
              <img src={IMAGES.logo} alt="Members Club" className="w-9 h-9 object-contain drop-shadow-[0_0_14px_var(--mc-accent-glow)]"/>
              <span className="font-display font-bold text-[19px] tracking-tight">Members Club</span>
            </a>
            <p className="text-sm text-[var(--mc-ink2)] leading-relaxed mt-4 max-w-[280px]">A plataforma de área de membros que traduz quanto o seu infoproduto vale.</p>
          </div>
          <FooterCol title="Produto" links={[['Vitrine','#vitrine'],['Recursos','#features'],['Planos','#planos'],['Segurança','#seguranca']]}/>
          <FooterCol title="Conta" links={[['Entrar',URLS.login],['Criar conta',URLS.register],['Demonstração','#']]}/>
          <FooterCol title="Suporte" links={[['FAQ','#faq'],['Central de ajuda','#'],['Status','#'],['Contato','#']]}/>
        </div>
        <div className="pt-8 flex justify-between items-center flex-wrap gap-4 text-[13px] text-[var(--mc-ink3)]">
          <span>© 2026 Members Club · mymembersclub.com.br</span>
          <span>Plataforma 100% brasileira</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h5 className="font-display text-[13px] font-bold uppercase tracking-[0.1em] text-white mb-4">{title}</h5>
      {links.map(([l, h]) => (
        <a key={l} href={h} className="block text-sm text-[var(--mc-ink2)] py-1.5 hover:text-[var(--mc-accent)] transition">{l}</a>
      ))}
    </div>
  );
}

function SecHead({ eyebrow, title, desc }: { eyebrow: string; title: React.ReactNode; desc?: React.ReactNode }) {
  return (
    <div className="mc-reveal text-center max-w-[800px] mx-auto mb-20">
      <div className="inline-block px-3.5 py-1.5 mb-4 font-display text-xs font-semibold uppercase tracking-[0.14em] text-[var(--mc-accent)] bg-[var(--mc-accent-soft)] border border-[var(--mc-accent-ring)] rounded-full">{eyebrow}</div>
      <h2 className="mc-sec-title">{title}</h2>
      {desc && <p className="mc-sec-desc">{desc}</p>}
    </div>
  );
}

// ───────────────── STYLES (injected) ─────────────────
function McStyles() {
  return (
    <style jsx global>{`
      .mc-root {
        --mc-g0: #06060a;
        --mc-g1: #0c0c14;
        --mc-g2: #111119;
        --mc-g3: #181822;
        --mc-ink1: #f0f0f5;
        --mc-ink2: #8b8b9e;
        --mc-ink3: #5a5a6e;
        --mc-accent: #3b82f6;
        --mc-accent-2: #60a5fa;
        --mc-accent-3: #93c5fd;
        --mc-accent-soft: rgba(59,130,246,.10);
        --mc-accent-glow: rgba(59,130,246,.35);
        --mc-accent-ring: rgba(59,130,246,.22);
        /* Aliases consumed by landing-mockups.tsx (no mc- prefix). */
        --accent: var(--mc-accent);
        --accent-soft: var(--mc-accent-soft);
        --accent-ring: var(--mc-accent-ring);
        --ink1: var(--mc-ink1);
      }
      .mc-text-gradient {
        background: linear-gradient(135deg, var(--mc-accent), var(--mc-accent-2) 50%, var(--mc-accent-3));
        -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
      }
      .mc-sec-title {
        font-family: 'Outfit', system-ui, sans-serif;
        font-size: clamp(36px, 5vw, 64px);
        font-weight: 800; letter-spacing: -0.04em;
        line-height: 1.04; margin-bottom: 20px; text-wrap: balance;
      }
      .mc-sec-desc {
        font-size: 18px; color: var(--mc-ink2);
        max-width: 640px; line-height: 1.6; margin: 0 auto; text-wrap: pretty;
      }
      .mc-btn-primary, .mc-btn-outline {
        display: inline-flex; align-items: center; gap: 8px;
        font-weight: 600; font-size: 15px;
        padding: 13px 26px; border-radius: 12px;
        text-decoration: none; cursor: pointer; white-space: nowrap;
        transition: transform .25s, box-shadow .25s, border-color .25s, color .25s, background .25s;
      }
      .mc-btn-primary {
        background: linear-gradient(180deg, var(--mc-accent-2), var(--mc-accent));
        color: #06060a;
        box-shadow: 0 0 24px var(--mc-accent-glow), 0 6px 20px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25);
      }
      .mc-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 0 36px var(--mc-accent-glow), 0 10px 28px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.3); }
      .mc-btn-outline { background: transparent; color: var(--mc-ink1); border: 1px solid rgba(255,255,255,.10); }
      .mc-btn-outline:hover { border-color: var(--mc-accent); color: var(--mc-accent); background: var(--mc-accent-soft); }
      .mc-btn-lg { padding: 17px 34px; font-size: 16px; border-radius: 14px; }
      .mc-fcard {
        background: var(--mc-g2); border: 1px solid rgba(255,255,255,.06);
        border-radius: 18px; padding: 32px 28px; min-height: 220px;
        transition: transform .35s, border-color .35s, background .35s;
        position: relative; overflow: hidden;
      }
      .mc-fcard:hover {
        transform: translateY(-4px);
        border-color: var(--mc-accent-ring);
        background: linear-gradient(180deg, var(--mc-g2), color-mix(in srgb, var(--mc-g2) 80%, var(--mc-accent)));
      }
      .mc-reveal { opacity: 0; transform: translateY(36px); transition: opacity .9s cubic-bezier(.22,1,.36,1), transform .9s cubic-bezier(.22,1,.36,1); }
      .mc-reveal.mc-visible { opacity: 1; transform: translateY(0); }
      .mc-sub-zero {
        background: linear-gradient(180deg, var(--mc-accent-soft), color-mix(in oklab, var(--mc-accent) 8%, transparent));
        border: 1px solid var(--mc-accent-ring);
        box-shadow: 0 0 40px var(--mc-accent-glow), inset 0 1px 0 rgba(255,255,255,.08);
        animation: mcZeroPulse 3.2s ease-in-out infinite;
      }
      .mc-sub-zero::before {
        content: ''; position: absolute; inset: -1px; border-radius: inherit; padding: 1px;
        background: linear-gradient(90deg, transparent, var(--mc-accent), transparent);
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor; mask-composite: exclude; opacity: .7;
      }
      .mc-zero-glow {
        font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 1.35em; letter-spacing: -0.04em;
        background: linear-gradient(180deg, var(--mc-accent-2), var(--mc-accent));
        -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
        filter: drop-shadow(0 0 12px var(--mc-accent-glow)); margin: 0 2px;
      }
      @keyframes mcZeroPulse {
        0%,100% { box-shadow: 0 0 40px var(--mc-accent-glow), inset 0 1px 0 rgba(255,255,255,.08); }
        50% { box-shadow: 0 0 70px var(--mc-accent-glow), inset 0 1px 0 rgba(255,255,255,.12); }
      }
      @keyframes mcDrift { 0%,100% { transform: translate3d(-50%,0,0) scale(1); } 50% { transform: translate3d(-48%,-2%,0) scale(1.05); } }
      .mc-drift { animation: mcDrift 18s ease-in-out infinite; }
      @keyframes mcPulse { 0%,100% { opacity: .4; } 50% { opacity: 1; } }
      .mc-pulse { animation: mcPulse 2.4s ease-in-out infinite; }
      @keyframes mcMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      .mc-marquee { animation: mcMarquee 40s linear infinite; }
    `}</style>
  );
}

