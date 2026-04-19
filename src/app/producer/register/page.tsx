"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STEPS = ["Conta", "Negócio", "Nicho", "Final"];

const BUSINESS_TYPES = [
  { value: "infoprodutos", label: "Infoprodutos" },
  { value: "ecommerce", label: "Ecommerce" },
  { value: "nutraceuticos", label: "Nutracêuticos" },
  { value: "dropshipping", label: "Dropshipping" },
  { value: "saas", label: "SaaS" },
  { value: "servicos", label: "Serviços" },
  { value: "comecando", label: "Ainda estou começando" },
];

const NICHES = [
  { value: "saude", label: "Saúde" },
  { value: "renda_extra", label: "Renda Extra" },
  { value: "relacionamento", label: "Relacionamento" },
  { value: "dev_pessoal", label: "Dev. Pessoal" },
  { value: "beleza", label: "Beleza" },
  { value: "financas", label: "Finanças" },
  { value: "tecnologia", label: "Tecnologia" },
  { value: "outros", label: "Outros" },
];

const REVENUES = [
  { value: "sem_faturamento", label: "Ainda não faturo" },
  { value: "ate_10k", label: "Até R$ 10 mil" },
  { value: "10k_50k", label: "R$ 10-50 mil" },
  { value: "50k_100k", label: "R$ 50-100 mil" },
  { value: "100k_1m", label: "R$ 100 mil - 1 milhão" },
  { value: "acima_1m", label: "Mais de R$ 1 milhão" },
];

const SOURCES = [
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "google", label: "Google" },
  { value: "facebook", label: "Facebook" },
  { value: "indicacao", label: "Indicação" },
  { value: "outro", label: "Outro" },
];

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function ProducerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [businessType, setBusinessType] = useState("");
  const [niche, setNiche] = useState("");
  const [monthlyRevenue, setMonthlyRevenue] = useState("");
  const [referralSource, setReferralSource] = useState("");

  function validateStep0() {
    if (!name.trim()) return "Nome é obrigatório";
    if (!email.trim()) return "Email é obrigatório";
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) return "Telefone inválido";
    if (password.length < 6) return "A senha precisa ter pelo menos 6 caracteres";
    if (password !== confirm) return "As senhas não conferem";
    if (!agreed) return "Você precisa concordar com os termos";
    return null;
  }

  function next() {
    setError("");
    if (step === 0) {
      const err = validateStep0();
      if (err) { setError(err); return; }
    }
    if (step === 1 && !businessType) { setError("Selecione uma opção"); return; }
    if (step === 2 && !niche) { setError("Selecione uma opção"); return; }
    setStep(step + 1);
  }

  function back() {
    setError("");
    setStep(step - 1);
  }

  async function handleSubmit() {
    setError("");
    if (!monthlyRevenue) { setError("Selecione seu faturamento"); return; }
    if (!referralSource) { setError("Selecione como conheceu"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register-producer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.replace(/\D/g, ""),
          document: document.replace(/\D/g, "") || undefined,
          businessType,
          niche,
          monthlyRevenue,
          referralSource,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Erro ao criar conta");
        setLoading(false);
        return;
      }
      router.push(`/verify-email?email=${encodeURIComponent(email.trim())}&next=/producer/billing`);
    } catch {
      setError("Erro ao conectar com o servidor");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Members Club</h1>
          <p className="text-sm font-medium text-indigo-400 mt-2">Crie sua conta de produtor</p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  i <= step
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-500"
                }`}>
                  {i < step ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className={`text-xs mt-1 ${i <= step ? "text-indigo-400" : "text-gray-600"}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 h-0.5 mx-1 mb-4 ${i < step ? "bg-indigo-600" : "bg-gray-800"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {step === 0 && (
            <div className="space-y-4">
              <Input label="Nome completo *" type="text" value={name} onChange={setName} placeholder="Seu nome" />
              <Input label="Email *" type="email" value={email} onChange={setEmail} placeholder="seu@email.com" autoComplete="email" />
              <Input
                label="Telefone *"
                type="tel"
                value={phone}
                onChange={(v) => setPhone(formatPhone(v))}
                placeholder="(11) 99999-9999"
              />
              <Input label="CPF/CNPJ (opcional)" type="text" value={document} onChange={setDocument} placeholder="000.000.000-00" />
              <Input label="Senha *" type="password" value={password} onChange={setPassword} placeholder="Mín. 6 caracteres" autoComplete="new-password" />
              <Input label="Confirmar senha *" type="password" value={confirm} onChange={setConfirm} placeholder="Digite novamente" autoComplete="new-password" />
              <label className="flex items-start gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-indigo-500"
                />
                Concordo com os Termos de Uso e Política de Privacidade
              </label>
              <button onClick={next} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition">
                Próximo
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white text-center">O que você vende hoje?</h2>
              <div className="grid grid-cols-2 gap-3">
                {BUSINESS_TYPES.map((bt) => (
                  <SelectCard key={bt.value} label={bt.label} selected={businessType === bt.value} onClick={() => setBusinessType(bt.value)} />
                ))}
              </div>
              <StepButtons onBack={back} onNext={next} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white text-center">Qual seu principal nicho?</h2>
              <div className="grid grid-cols-2 gap-3">
                {NICHES.map((n) => (
                  <SelectCard key={n.value} label={n.label} selected={niche === n.value} onClick={() => setNiche(n.value)} />
                ))}
              </div>
              <StepButtons onBack={back} onNext={next} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-white text-center">Qual seu faturamento mensal?</h2>
                <div className="grid grid-cols-2 gap-3">
                  {REVENUES.map((r) => (
                    <SelectCard key={r.value} label={r.label} selected={monthlyRevenue === r.value} onClick={() => setMonthlyRevenue(r.value)} />
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-white text-center">Como conheceu a plataforma?</h2>
                <div className="grid grid-cols-2 gap-3">
                  {SOURCES.map((s) => (
                    <SelectCard key={s.value} label={s.label} selected={referralSource === s.value} onClick={() => setReferralSource(s.value)} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={back} className="flex-1 py-3 border border-gray-700 text-gray-300 hover:bg-gray-800 font-medium rounded-lg transition">
                  Voltar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg transition"
                >
                  {loading ? "Criando conta..." : "Criar conta"}
                </button>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-gray-500">
            Já tem conta?{" "}
            <Link href="/producer/login" className="text-indigo-400 hover:underline font-medium">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Input({
  label, type, value, onChange, placeholder, autoComplete,
}: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string; autoComplete?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

function SelectCard({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-3 rounded-xl text-sm font-medium text-left transition border ${
        selected
          ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
          : "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600"
      }`}
    >
      {label}
    </button>
  );
}

function StepButtons({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div className="flex gap-3 pt-2">
      <button onClick={onBack} className="flex-1 py-3 border border-gray-700 text-gray-300 hover:bg-gray-800 font-medium rounded-lg transition">
        Voltar
      </button>
      <button onClick={onNext} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition">
        Próximo
      </button>
    </div>
  );
}
