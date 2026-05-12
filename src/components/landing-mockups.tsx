// Members Club landing — SVG mockups (Vitrine, Dashboard, Comunidade, Personalização).
// Pure SVG components, no hooks. CSS variables (--accent, --accent-soft, --accent-ring,
// --ink1) are aliased inside .mc-root in landing/page.tsx McStyles.


// ---- VITRINE NETFLIX ----
export function VitrineMockup() {
  return (
  <svg viewBox="0 0 1100 660" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style={{display:'block', width:'100%', height:'auto'}}>
    <defs>
      <linearGradient id="vbanner" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="var(--accent)" stopOpacity=".55"/>
        <stop offset=".5" stopColor="var(--accent)" stopOpacity=".15"/>
        <stop offset="1" stopColor="#0c0c14" stopOpacity="0"/>
      </linearGradient>
      <linearGradient id="vcard" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#1e1e2a"/>
        <stop offset="1" stopColor="#0f0f17"/>
      </linearGradient>
      <linearGradient id="vfade" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#06060a" stopOpacity="0"/>
        <stop offset="1" stopColor="#06060a" stopOpacity=".95"/>
      </linearGradient>
    </defs>
    <rect width="1100" height="660" fill="#0c0c14"/>
    {/* Top bar */}
    <rect width="1100" height="56" fill="#06060a"/>
    <rect x="0" y="55" width="1100" height="1" fill="rgba(255,255,255,.06)"/>
    <circle cx="24" cy="28" r="6" fill="#ff5f57"/>
    <circle cx="44" cy="28" r="6" fill="#febc2e"/>
    <circle cx="64" cy="28" r="6" fill="#28c840"/>
    <rect x="120" y="20" width="180" height="16" rx="3" fill="rgba(255,255,255,.08)"/>
    {/* Sidebar */}
    <rect x="0" y="56" width="220" height="604" fill="#0a0a12"/>
    <rect x="220" y="56" width="1" height="604" fill="rgba(255,255,255,.06)"/>
    <rect x="24" y="84" width="120" height="14" rx="3" fill="rgba(255,255,255,.18)"/>
    {[0,1,2,3,4,5].map(i => (
      <g key={i}>
        <rect x="20" y={140 + i*42} width="180" height="32" rx="8" fill={i===0 ? "var(--accent-soft)" : "transparent"}/>
        <circle cx="36" cy={156 + i*42} r="6" fill={i===0 ? "var(--accent)" : "rgba(255,255,255,.3)"}/>
        <rect x="56" y={150 + i*42} width={[60,80,90,75,65,85][i]} height="11" rx="2" fill={i===0 ? "var(--ink1)" : "rgba(255,255,255,.4)"}/>
      </g>
    ))}
    {/* Hero banner */}
    <rect x="244" y="80" width="832" height="280" rx="14" fill="#1a1a26"/>
    <rect x="244" y="80" width="832" height="280" rx="14" fill="url(#vbanner)"/>
    <rect x="244" y="80" width="832" height="280" rx="14" fill="url(#vfade)"/>
    <rect x="276" y="280" width="120" height="24" rx="12" fill="var(--accent-soft)" stroke="var(--accent-ring)"/>
    <rect x="290" y="288" width="92" height="8" rx="2" fill="var(--accent)"/>
    <rect x="276" y="316" width="380" height="22" rx="3" fill="#fff"/>
    <rect x="276" y="346" width="280" height="14" rx="2" fill="rgba(255,255,255,.5)"/>
    {/* Continuar assistindo */}
    <rect x="276" y="396" width="240" height="14" rx="2" fill="#fff"/>
    {[0,1,2,3].map(i => (
      <g key={i}>
        <rect x={244 + 32 + i*210} y="430" width="190" height="120" rx="10" fill="url(#vcard)" stroke="rgba(255,255,255,.06)"/>
        <rect x={244 + 32 + i*210} y="540" width="190" height="3" fill="rgba(255,255,255,.1)"/>
        <rect x={244 + 32 + i*210} y="540" width={[150, 110, 80, 170][i]} height="3" fill="var(--accent)"/>
        <rect x={244 + 44 + i*210} y="558" width="120" height="9" rx="2" fill="rgba(255,255,255,.85)"/>
        <rect x={244 + 44 + i*210} y="572" width="80" height="7" rx="2" fill="rgba(255,255,255,.4)"/>
        {/* play icon overlay */}
        <circle cx={244 + 32 + i*210 + 95} cy="490" r="22" fill="rgba(0,0,0,.5)" stroke="rgba(255,255,255,.4)"/>
        <path d={`M${244 + 32 + i*210 + 90} 482 L${244 + 32 + i*210 + 105} 490 L${244 + 32 + i*210 + 90} 498 Z`} fill="#fff"/>
      </g>
    ))}
    {/* Próximos */}
    <rect x="276" y="600" width="180" height="12" rx="2" fill="rgba(255,255,255,.7)"/>
    <rect x="276" y="624" width="800" height="2" fill="rgba(255,255,255,.06)"/>
  </svg>
  );
}

// ---- DASHBOARD ----
export function DashboardMockup() {
  return (
  <svg viewBox="0 0 1100 660" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style={{display:'block', width:'100%', height:'auto'}}>
    <defs>
      <linearGradient id="dbar" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="var(--accent)" stopOpacity=".9"/>
        <stop offset="1" stopColor="var(--accent)" stopOpacity=".2"/>
      </linearGradient>
      <linearGradient id="dchart" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="var(--accent)" stopOpacity=".4"/>
        <stop offset="1" stopColor="var(--accent)" stopOpacity="0"/>
      </linearGradient>
    </defs>
    <rect width="1100" height="660" fill="#0c0c14"/>
    <rect width="1100" height="56" fill="#06060a"/>
    <rect y="55" width="1100" height="1" fill="rgba(255,255,255,.06)"/>
    <circle cx="24" cy="28" r="6" fill="#ff5f57"/>
    <circle cx="44" cy="28" r="6" fill="#febc2e"/>
    <circle cx="64" cy="28" r="6" fill="#28c840"/>
    <rect x="120" y="20" width="200" height="16" rx="3" fill="rgba(255,255,255,.08)"/>
    {/* Title row */}
    <rect x="40" y="84" width="280" height="22" rx="3" fill="#fff"/>
    <rect x="40" y="116" width="180" height="13" rx="2" fill="rgba(255,255,255,.45)"/>
    <rect x="900" y="86" width="160" height="36" rx="10" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.1)"/>
    <rect x="918" y="100" width="92" height="9" rx="2" fill="rgba(255,255,255,.7)"/>
    {/* KPI cards */}
    {[
      {l:'Receita do mês', v:'R$ 84.320', d:'+18.4%'},
      {l:'Alunos ativos', v:'2.847', d:'+12.1%'},
      {l:'Ticket médio', v:'R$ 297', d:'+4.2%'},
      {l:'Conclusão', v:'73%', d:'+8.6%'},
    ].map((k,i) => (
      <g key={i}>
        <rect x={40 + i*255} y="156" width="240" height="118" rx="14" fill="#15151f" stroke="rgba(255,255,255,.06)"/>
        <rect x={56 + i*255} y="174" width="100" height="9" rx="2" fill="rgba(255,255,255,.5)"/>
        <text x={56 + i*255} y="220" fill="#fff" fontFamily="Outfit" fontWeight="800" fontSize="28" letterSpacing="-1">{k.v}</text>
        <rect x={56 + i*255} y="238" width="56" height="20" rx="6" fill="var(--accent-soft)"/>
        <text x={64 + i*255} y="252" fill="var(--accent)" fontFamily="Outfit" fontWeight="600" fontSize="11">{k.d}</text>
      </g>
    ))}
    {/* Big chart */}
    <rect x="40" y="296" width="700" height="324" rx="14" fill="#15151f" stroke="rgba(255,255,255,.06)"/>
    <rect x="60" y="318" width="220" height="14" rx="2" fill="#fff"/>
    <rect x="60" y="340" width="140" height="10" rx="2" fill="rgba(255,255,255,.4)"/>
    <rect x="610" y="318" width="100" height="28" rx="8" fill="rgba(255,255,255,.05)"/>
    {/* Bars */}
    {[140, 100, 175, 130, 200, 160, 220, 185, 240, 210, 260, 230].map((h, i) => (
      <g key={i}>
        <rect x={70 + i*55} y={580 - h} width="32" height={h} rx="6" fill="url(#dbar)"/>
      </g>
    ))}
    {/* Right side cards */}
    <rect x="760" y="296" width="300" height="156" rx="14" fill="#15151f" stroke="rgba(255,255,255,.06)"/>
    <rect x="780" y="318" width="160" height="13" rx="2" fill="#fff"/>
    {[0,1,2,3].map(i => (
      <g key={i}>
        <circle cx="794" cy={356 + i*22} r="4" fill="var(--accent)" opacity={1 - i*0.2}/>
        <rect x="808" y={352 + i*22} width={[150, 130, 110, 90][i]} height="9" rx="2" fill="rgba(255,255,255,.7)"/>
        <rect x="990" y={352 + i*22} width="40" height="9" rx="2" fill="rgba(255,255,255,.4)"/>
      </g>
    ))}
    <rect x="760" y="464" width="300" height="156" rx="14" fill="#15151f" stroke="rgba(255,255,255,.06)"/>
    <rect x="780" y="486" width="180" height="13" rx="2" fill="#fff"/>
    <path d="M780 580 L820 565 L860 555 L900 540 L940 525 L980 515 L1040 500" stroke="var(--accent)" strokeWidth="2.5" fill="none"/>
    <path d="M780 580 L820 565 L860 555 L900 540 L940 525 L980 515 L1040 500 L1040 600 L780 600 Z" fill="url(#dchart)"/>
  </svg>
  );
}

// ---- COMUNIDADE ----
export function CommunityMockup() {
  return (
  <svg viewBox="0 0 1100 660" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style={{display:'block', width:'100%', height:'auto'}}>
    <rect width="1100" height="660" fill="#0c0c14"/>
    <rect width="1100" height="56" fill="#06060a"/>
    <rect y="55" width="1100" height="1" fill="rgba(255,255,255,.06)"/>
    <circle cx="24" cy="28" r="6" fill="#ff5f57"/>
    <circle cx="44" cy="28" r="6" fill="#febc2e"/>
    <circle cx="64" cy="28" r="6" fill="#28c840"/>
    {/* categories */}
    <rect x="40" y="92" width="1020" height="48" rx="12" fill="#15151f" stroke="rgba(255,255,255,.06)"/>
    {['Geral','Resultados','Dúvidas','Networking','Lives'].map((c,i) => (
      <g key={i}>
        <rect x={56 + i*180} y="104" width="160" height="24" rx="12" fill={i===0 ? "var(--accent-soft)" : "transparent"} stroke={i===0 ? "var(--accent-ring)" : "rgba(255,255,255,.1)"}/>
        <text x={136 + i*180} y="120" textAnchor="middle" fontFamily="Plus Jakarta Sans" fontSize="11" fontWeight="600" fill={i===0 ? "var(--accent)" : "rgba(255,255,255,.5)"}>{c}</text>
      </g>
    ))}
    {/* posts */}
    {[
      {n:'Mariana S.', t:'Bati R$ 50k em 30 dias!', tag:'Resultados'},
      {n:'Rodrigo L.', t:'Compartilhando minha jornada do zero', tag:'Geral'},
      {n:'Ana P.', t:'Como vocês fazem captação no IG?', tag:'Dúvidas'},
    ].map((p,i) => (
      <g key={i}>
        <rect x="40" y={168 + i*150} width="700" height="130" rx="14" fill="#15151f" stroke="rgba(255,255,255,.06)"/>
        <circle cx="76" cy={204 + i*150} r="20" fill="var(--accent-soft)" stroke="var(--accent-ring)"/>
        <text x="76" y={210 + i*150} textAnchor="middle" fontFamily="Outfit" fontWeight="700" fontSize="14" fill="var(--accent)">{p.n[0]}</text>
        <text x="108" y={200 + i*150} fontFamily="Outfit" fontWeight="700" fontSize="14" fill="#fff">{p.n}</text>
        <rect x="108" y={210 + i*150} width="60" height="14" rx="7" fill="var(--accent-soft)"/>
        <text x="138" y={221 + i*150} textAnchor="middle" fontFamily="Plus Jakarta Sans" fontSize="9" fontWeight="600" fill="var(--accent)">{p.tag}</text>
        <text x="184" y={222 + i*150} fontFamily="Plus Jakarta Sans" fontSize="11" fill="rgba(255,255,255,.4)">há 2h</text>
        <text x="56" y={252 + i*150} fontFamily="Outfit" fontWeight="600" fontSize="16" fill="#fff">{p.t}</text>
        <rect x="56" y={262 + i*150} width="640" height="9" rx="2" fill="rgba(255,255,255,.3)"/>
        {/* actions */}
        <g transform={`translate(56, ${278 + i*150})`}>
          <path d="M2 4a3 3 0 0 1 6 0c0 3-6 6-6 6s-6-3-6-6a3 3 0 0 1 6 0z" stroke="rgba(255,255,255,.5)" fill="none" transform="translate(6,0)"/>
          <text x="20" y="6" fontFamily="Plus Jakarta Sans" fontSize="11" fill="rgba(255,255,255,.5)">{['234', '189', '76'][i]}</text>
          <circle cx="80" cy="3" r="1" fill="rgba(255,255,255,.3)"/>
          <text x="92" y="6" fontFamily="Plus Jakarta Sans" fontSize="11" fill="rgba(255,255,255,.5)">{['42', '28', '15'][i]} comentários</text>
        </g>
      </g>
    ))}
    {/* sidebar */}
    <rect x="760" y="168" width="300" height="180" rx="14" fill="#15151f" stroke="rgba(255,255,255,.06)"/>
    <rect x="780" y="190" width="180" height="13" rx="2" fill="#fff"/>
    <rect x="780" y="208" width="120" height="9" rx="2" fill="rgba(255,255,255,.4)"/>
    {[1,2,3,4,5].map(i => (
      <g key={i}>
        <text x="780" y={244 + (i-1)*22} fontFamily="Outfit" fontWeight="700" fontSize="14" fill="var(--accent)">{i}.</text>
        <circle cx="810" cy={239 + (i-1)*22} r="9" fill="var(--accent-soft)"/>
        <rect x="826" y={236 + (i-1)*22} width={120 - i*8} height="8" rx="2" fill="rgba(255,255,255,.7)"/>
        <rect x="980" y={236 + (i-1)*22} width="36" height="8" rx="2" fill="rgba(255,255,255,.4)"/>
      </g>
    ))}
    <rect x="760" y="364" width="300" height="252" rx="14" fill="#15151f" stroke="rgba(255,255,255,.06)"/>
    <rect x="780" y="386" width="160" height="13" rx="2" fill="#fff"/>
    <rect x="780" y="416" width="260" height="80" rx="10" fill="var(--accent-soft)" stroke="var(--accent-ring)"/>
    <text x="794" y="440" fontFamily="Outfit" fontWeight="700" fontSize="13" fill="var(--accent)">🎥 Live em 2 dias</text>
    <text x="794" y="462" fontFamily="Plus Jakarta Sans" fontSize="11" fill="rgba(255,255,255,.7)">Q&amp;A com a Mariana</text>
    <text x="794" y="478" fontFamily="Plus Jakarta Sans" fontSize="10" fill="rgba(255,255,255,.4)">Quinta · 20h · YouTube</text>
  </svg>
  );
}

// ---- PERSONALIZAÇÃO ----
export function BrandingMockup() {
  return (
  <svg viewBox="0 0 1100 660" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style={{display:'block', width:'100%', height:'auto'}}>
    <rect width="1100" height="660" fill="#0c0c14"/>
    <rect width="1100" height="56" fill="#06060a"/>
    <circle cx="24" cy="28" r="6" fill="#ff5f57"/>
    <circle cx="44" cy="28" r="6" fill="#febc2e"/>
    <circle cx="64" cy="28" r="6" fill="#28c840"/>
    {/* Sidebar config */}
    <rect x="0" y="56" width="380" height="604" fill="#0a0a12"/>
    <rect x="380" y="56" width="1" height="604" fill="rgba(255,255,255,.06)"/>
    <text x="32" y="100" fontFamily="Outfit" fontWeight="700" fontSize="18" fill="#fff">Personalização</text>
    <rect x="32" y="116" width="200" height="11" rx="2" fill="rgba(255,255,255,.4)"/>
    {/* Color section */}
    <rect x="32" y="156" width="316" height="124" rx="12" fill="#15151f" stroke="rgba(255,255,255,.06)"/>
    <text x="48" y="182" fontFamily="Outfit" fontWeight="600" fontSize="13" fill="#fff">Cor primária</text>
    {['var(--accent)', '#10b981', '#f59e0b', '#ef4444', '#a78bfa', '#ec4899'].map((c,i) => (
      <circle key={i} cx={64 + i*44} cy="232" r="14" fill={c} stroke={i===0 ? "rgba(255,255,255,.4)" : "transparent"} strokeWidth="2"/>
    ))}
    <rect x="48" y="252" width="284" height="20" rx="6" fill="rgba(255,255,255,.06)"/>
    <text x="56" y="266" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="rgba(255,255,255,.7)">#3B82F6</text>
    {/* Logo upload */}
    <rect x="32" y="296" width="316" height="100" rx="12" fill="#15151f" stroke="rgba(255,255,255,.06)"/>
    <text x="48" y="322" fontFamily="Outfit" fontWeight="600" fontSize="13" fill="#fff">Logo</text>
    <rect x="48" y="334" width="64" height="48" rx="8" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.1)" strokeDasharray="4 4"/>
    <rect x="124" y="346" width="180" height="10" rx="2" fill="rgba(255,255,255,.6)"/>
    <rect x="124" y="364" width="120" height="9" rx="2" fill="rgba(255,255,255,.3)"/>
    {/* Theme toggle */}
    <rect x="32" y="412" width="316" height="64" rx="12" fill="#15151f" stroke="rgba(255,255,255,.06)"/>
    <text x="48" y="438" fontFamily="Outfit" fontWeight="600" fontSize="13" fill="#fff">Tema</text>
    <text x="48" y="456" fontFamily="Plus Jakarta Sans" fontSize="11" fill="rgba(255,255,255,.4)">Claro / Escuro / Auto</text>
    <rect x="252" y="424" width="80" height="32" rx="16" fill="var(--accent-soft)" stroke="var(--accent-ring)"/>
    <circle cx="316" cy="440" r="12" fill="var(--accent)"/>
    {/* Preview label */}
    <text x="412" y="100" fontFamily="Outfit" fontWeight="700" fontSize="14" fill="rgba(255,255,255,.5)">PREVIEW EM TEMPO REAL</text>
    {/* Preview frame */}
    <rect x="412" y="120" width="640" height="500" rx="14" fill="#0a0a12" stroke="var(--accent-ring)"/>
    <rect x="412" y="120" width="640" height="48" rx="14" fill="#06060a"/>
    <rect x="412" y="167" width="640" height="1" fill="rgba(255,255,255,.06)"/>
    {/* Preview logo */}
    <rect x="436" y="136" width="24" height="16" rx="4" fill="var(--accent)"/>
    <rect x="468" y="139" width="60" height="10" rx="2" fill="#fff"/>
    {/* hero in preview */}
    <rect x="436" y="200" width="320" height="20" rx="3" fill="#fff"/>
    <rect x="436" y="228" width="240" height="20" rx="3" fill="#fff"/>
    <rect x="436" y="268" width="380" height="11" rx="2" fill="rgba(255,255,255,.4)"/>
    <rect x="436" y="284" width="280" height="11" rx="2" fill="rgba(255,255,255,.4)"/>
    <rect x="436" y="316" width="160" height="38" rx="10" fill="var(--accent)"/>
    <text x="516" y="340" textAnchor="middle" fontFamily="Outfit" fontWeight="700" fontSize="13" fill="#fff">Começar agora</text>
    {/* card preview */}
    {[0,1,2].map(i => (
      <g key={i}>
        <rect x={436 + i*195} y="396" width="180" height="190" rx="10" fill="#15151f" stroke="rgba(255,255,255,.06)"/>
        <rect x={436 + i*195} y="396" width="180" height="100" rx="10" fill={i === 0 ? "var(--accent-soft)" : "rgba(255,255,255,.04)"}/>
        <rect x={448 + i*195} y="510" width="120" height="11" rx="2" fill="#fff"/>
        <rect x={448 + i*195} y="528" width="80" height="9" rx="2" fill="rgba(255,255,255,.4)"/>
        <rect x={448 + i*195} y="556" width="156" height="3" fill="rgba(255,255,255,.1)"/>
        <rect x={448 + i*195} y="556" width={[120, 80, 50][i]} height="3" fill="var(--accent)"/>
      </g>
    ))}
  </svg>
  );
}

