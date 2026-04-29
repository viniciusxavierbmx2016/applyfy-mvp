"use client";

import { useEffect, useState } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function StudentTour() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    fetch("/api/student/onboarding")
      .then((r) => r.json())
      .then((data) => {
        if (!data.completed) setShouldShow(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!shouldShow) return;
    const timer = setTimeout(() => startTour(), 1500);
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
      doneBtnText: "Vamos lá!",
      progressText: "{{current}} de {{total}}",

      onDestroyStarted: () => {
        fetch("/api/student/onboarding", { method: "POST" }).catch(() => {});
        driverObj.destroy();
      },

      steps: [
        {
          popover: {
            title: "Bem-vindo à sua área de membros!",
            description:
              "Aqui você encontra todos os seus cursos, acompanha seu progresso e interage com a comunidade. Vamos fazer um tour rápido!",
            side: "over" as const,
            align: "center" as const,
          },
        },
        {
          element: '[data-tour="student-nav-home"]',
          popover: {
            title: "Início",
            description:
              "Esta é sua página inicial. Aqui você vê seus cursos matriculados e pode explorar novos cursos disponíveis.",
            side: "right" as const,
          },
        },
        {
          element: '[data-tour="student-banner"]',
          popover: {
            title: "Banner do workspace",
            description:
              "Essa é a vitrine do seu espaço de aprendizado. O banner e a saudação personalizada aparecem aqui.",
            side: "bottom" as const,
          },
        },
        {
          element: '[data-tour="student-my-courses"]',
          popover: {
            title: "Seus cursos",
            description:
              "Seus cursos matriculados aparecem aqui com o progresso de cada um. Clique em qualquer curso pra continuar assistindo.",
            side: "bottom" as const,
          },
        },
        {
          element: '[data-tour="student-search"]',
          popover: {
            title: "Buscar cursos",
            description:
              "Use a busca pra encontrar cursos por nome ou categoria. Filtre por categorias pra navegar mais rápido.",
            side: "bottom" as const,
          },
        },
        {
          element: '[data-tour="student-nav-lives"]',
          popover: {
            title: "Lives",
            description:
              "Acompanhe as lives ao vivo e gravadas. Quando uma live estiver acontecendo, você verá um indicador vermelho aqui.",
            side: "right" as const,
          },
        },
        {
          element: '[data-tour="student-nav-profile"]',
          popover: {
            title: "Meu Perfil",
            description:
              "Gerencie seus dados pessoais, veja seus certificados e acompanhe sua pontuação na gamificação.",
            side: "right" as const,
          },
        },
        {
          popover: {
            title: "É isso! Bons estudos!",
            description:
              'Agora é só acessar seus cursos e começar a aprender. Se quiser refazer este tour, clique no ícone (?) no canto superior direito.',
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
