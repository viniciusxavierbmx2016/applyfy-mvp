"use client";

import { useEffect, useState } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useUserStore } from "@/stores/user-store";

const PERM_TO_NAV: Record<string, string[]> = {
  MANAGE_LESSONS: ["nav-courses"],
  REPLY_COMMENTS: ["nav-courses"],
  MANAGE_STUDENTS: ["nav-students"],
  MANAGE_COMMUNITY: ["nav-community"],
  VIEW_ANALYTICS: ["nav-reports"],
};

function getVisibleNavIds(perms: string[]): Set<string> {
  const visible = new Set<string>();
  for (const p of perms) {
    for (const nav of PERM_TO_NAV[p] ?? []) visible.add(nav);
  }
  return visible;
}

type TourStep = {
  element?: string;
  popover: {
    title: string;
    description: string;
    side?: "top" | "right" | "bottom" | "left" | "over";
    align?: "start" | "center" | "end";
  };
};

function filterStepsByCollaborator(
  steps: TourStep[],
  collaboratorPerms: string[] | null
): TourStep[] {
  if (!collaboratorPerms) return steps;
  const visible = getVisibleNavIds(collaboratorPerms);
  return steps.filter((step) => {
    if (!step.element) return true;
    const m = step.element.match(/data-tour="(nav-[^"]+)"/);
    if (!m) return true;
    return visible.has(m[1]);
  });
}

export function ProducerTour() {
  const [shouldShow, setShouldShow] = useState(false);
  const collaborator = useUserStore((s) => s.collaborator);

  useEffect(() => {
    Promise.all([
      fetch("/api/producer/onboarding").then((r) => r.json()),
      fetch("/api/producer/billing").then((r) => r.json()),
    ])
      .then(([onboarding, billing]) => {
        const hasSubscription = billing?.subscription?.status === "ACTIVE";
        if (
          !onboarding.completed &&
          hasSubscription &&
          window.location.pathname === "/producer"
        ) {
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
    const allSteps: TourStep[] = [
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
              'Agora é só criar seu primeiro curso! Vá em "Meus Cursos" e clique em "Criar curso". Se quiser refazer este tour, clique no seu nome no canto superior direito e selecione "Guia da plataforma".',
            side: "over" as const,
            align: "center" as const,
          },
        },
    ];

    const steps = filterStepsByCollaborator(
      allSteps,
      collaborator?.permissions ?? null
    );

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

      steps,
    });

    driverObj.drive();
  }

  return null;
}

const TOUR_CONFIG = {
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
};

function getCourseTourSteps() {
  return [
    {
      popover: {
        title: "Criando seu curso",
        description:
          "Vamos entender como estruturar seu curso. Um curso é dividido em módulos, e cada módulo contém aulas.",
        side: "over" as const,
        align: "center" as const,
      },
    },
    {
      element: '[data-tour="course-tabs"]',
      popover: {
        title: "Abas do curso",
        description:
          "Cada curso tem várias seções: Informações (título, descrição, thumbnail), Conteúdo (módulos e aulas), Alunos, Comentários e Personalização.",
        side: "bottom" as const,
      },
    },
    {
      element: '[data-tour="course-tab-info"]',
      popover: {
        title: "Informações",
        description:
          "Configure o título, descrição, thumbnail, preço e termos de uso do curso. Tudo que o aluno vê antes de se matricular.",
        side: "bottom" as const,
      },
    },
    {
      element: '[data-tour="course-tab-content"]',
      popover: {
        title: "Conteúdo",
        description:
          "Aqui você cria os módulos e adiciona as aulas. Cada aula pode ter vídeo, texto, materiais em PDF e quiz.",
        side: "bottom" as const,
      },
    },
    {
      element: '[data-tour="course-tab-students"]',
      popover: {
        title: "Alunos do curso",
        description:
          "Veja os alunos matriculados neste curso, seus progressos, e envie acessos manualmente.",
        side: "bottom" as const,
      },
    },
    {
      element: '[data-tour="course-tab-comments"]',
      popover: {
        title: "Comentários",
        description:
          "Gerencie os comentários dos alunos nas aulas. Se a moderação estiver ativa, aprove ou rejeite antes de publicar.",
        side: "bottom" as const,
      },
    },
    {
      element: '[data-tour="course-tab-customize"]',
      popover: {
        title: "Personalizar Curso",
        description:
          "Ative ou desative funcionalidades: comentários, comunidade, gamificação, certificado, moderação, reações. Cada curso pode ter configurações independentes.",
        side: "bottom" as const,
      },
    },
    {
      popover: {
        title: "Pronto pra criar!",
        description:
          'Comece criando os módulos na aba "Conteúdo" e adicione suas aulas. Seus alunos vão adorar!',
        side: "over" as const,
        align: "center" as const,
      },
    },
  ];
}

export function CourseTour() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    fetch("/api/producer/onboarding?type=course")
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
      const driverObj = driver({
        ...TOUR_CONFIG,
        onDestroyStarted: () => {
          fetch("/api/producer/onboarding", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "course" }),
          }).catch(() => {});
          driverObj.destroy();
        },
        steps: getCourseTourSteps(),
      });
      driverObj.drive();
    }, 1000);

    return () => clearTimeout(timer);
  }, [shouldShow]);

  return null;
}
