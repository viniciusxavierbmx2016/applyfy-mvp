"use client";

import { useEffect, useState } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function ProducerTour() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    fetch("/api/producer/onboarding")
      .then((r) => r.json())
      .then((data) => {
        if (!data.completed) {
          setShouldShow(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!shouldShow) return;

    const timer = setTimeout(() => {
      startTour();
    }, 1500);

    return () => clearTimeout(timer);
  }, [shouldShow]);

  function startTour() {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: "rgba(0, 0, 0, 0.75)",
      stagePadding: 8,
      stageRadius: 12,
      popoverClass: "mc-tour-popover",

      nextBtnText: "Próximo",
      prevBtnText: "Anterior",
      doneBtnText: "Concluir",
      progressText: "{{current}} de {{total}}",

      onDestroyStarted: () => {
        fetch("/api/producer/onboarding", { method: "POST" }).catch(() => {});
        driverObj.destroy();
      },

      steps: [
        {
          popover: {
            title: "Bem-vindo ao Members Club!",
            description:
              "Vamos fazer um tour rápido pra você conhecer a plataforma. Em poucos passos, você vai aprender a criar seus cursos e gerenciar seus alunos. Pode pular a qualquer momento.",
            side: "over" as const,
            align: "center" as const,
          },
        },
        {
          element: '[data-tour="dashboard-header"]',
          popover: {
            title: "Seu painel de controle",
            description:
              "Aqui você tem uma visão geral do seu workspace: KPIs de vendas, alunos, progresso dos cursos e muito mais. Tudo atualizado em tempo real.",
            side: "bottom" as const,
          },
        },
        {
          element: '[data-tour="dashboard-date-selector"]',
          popover: {
            title: "Filtre por período",
            description:
              "Use o seletor de datas pra analisar seus resultados em qualquer período: hoje, última semana, últimos 30 dias ou um intervalo personalizado.",
            side: "bottom" as const,
          },
        },
        {
          element: '[data-tour="nav-workspaces"]',
          popover: {
            title: "Workspaces",
            description:
              "Cada workspace é um ecossistema isolado para seus cursos. Você pode criar workspaces diferentes para projetos, marcas ou treinamentos separados. Cada um tem sua vitrine, alunos e configurações próprias.",
            side: "right" as const,
          },
        },
        {
          element: '[data-tour="nav-courses"]',
          popover: {
            title: "Meus Cursos",
            description:
              "Aqui você cria e gerencia todos os seus cursos. Cada curso tem módulos, aulas (vídeo, texto, PDF), quizzes, materiais complementares e uma comunidade integrada.",
            side: "right" as const,
          },
        },
        {
          element: '[data-tour="nav-students"]',
          popover: {
            title: "Meus Alunos",
            description:
              "Gerencie seus alunos: veja progresso, envie acessos, exporte dados, filtre por curso, tag ou status. Cada aluno tem uma página detalhada com histórico completo.",
            side: "right" as const,
          },
        },
        {
          element: '[data-tour="nav-community"]',
          popover: {
            title: "Comunidade",
            description:
              "Sua comunidade integrada ao curso. Alunos podem postar, comentar, compartilhar resultados. Você pode criar grupos temáticos e moderar o conteúdo.",
            side: "right" as const,
          },
        },
        {
          element: '[data-tour="nav-reports"]',
          popover: {
            title: "Relatórios",
            description:
              "Relatórios detalhados: conclusão de aulas, engajamento, aulas mais assistidas, alunos inativos. Exporte tudo em CSV.",
            side: "right" as const,
          },
        },
        {
          element: '[data-tour="nav-automations"]',
          popover: {
            title: "Automações",
            description:
              "Automatize tarefas: envie emails automáticos quando um aluno se matricula, conclui um módulo ou fica inativo. Configure delays e ações em cadeia.",
            side: "right" as const,
          },
        },
        {
          element: '[data-tour="nav-lives"]',
          popover: {
            title: "Lives",
            description:
              "Agende e gerencie lives para seus alunos. Integração com YouTube, Zoom e outras plataformas.",
            side: "right" as const,
          },
        },
        {
          element: '[data-tour="nav-settings"]',
          popover: {
            title: "Configurações",
            description:
              "Personalize seu workspace: cores, logo, domínio customizado, integrações (webhook, WhatsApp), billing e colaboradores.",
            side: "right" as const,
          },
        },
        {
          popover: {
            title: "Tudo pronto!",
            description:
              'Agora é só criar seu primeiro curso! Vá em "Meus Cursos" e clique em "Criar curso". Se tiver dúvidas, você pode refazer este tour em Configurações.',
            side: "over" as const,
            align: "center" as const,
          },
        },
      ],
    });

    driverObj.drive();
  }

  return null;
}
