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
    }, 1000);

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
              "Vamos fazer um tour rápido pela plataforma. Em poucos passos você vai entender como criar seus cursos e gerenciar seus alunos.",
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
