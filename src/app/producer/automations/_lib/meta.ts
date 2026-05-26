export const TRIGGER_META: Record<string, { short: string; icon: string; desc: string; behavioral?: boolean }> = {
  LESSON_COMPLETED: { short: "Completar aula", desc: "Quando um aluno finalizar uma aula", icon: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  MODULE_COMPLETED: { short: "Completar módulo", desc: "Quando todas as aulas do módulo forem concluídas", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  COURSE_COMPLETED: { short: "Completar curso", desc: "Quando o aluno finalizar todas as aulas", icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" },
  QUIZ_PASSED: { short: "Passar no quiz", desc: "Quando o aluno atingir a nota mínima", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  STUDENT_ENROLLED: { short: "Se matricular", desc: "Quando um aluno for matriculado", icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" },
  STUDENT_INACTIVE: { short: "Aluno inativo", desc: "Aluno não acessa há X dias", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", behavioral: true },
  STUDENT_NEVER_ACCESSED: { short: "Nunca acessou", desc: "Matriculado mas sem acesso", icon: "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21", behavioral: true },
  PROGRESS_BELOW: { short: "Baixo progresso", desc: "Aluno com progresso abaixo de X%", icon: "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6", behavioral: true },
  PROGRESS_ABOVE: { short: "Alto progresso", desc: "Aluno atingiu X% de progresso", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", behavioral: true },
  MODULE_NOT_STARTED: { short: "Módulo parado", desc: "Aluno não começou módulo após X dias", icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636", behavioral: true },
  HAS_TAG: { short: "Alunos com tag", desc: "Execute ação para alunos com uma tag específica", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z", behavioral: true },
  POINTS_REACHED: { short: "Atingir pontos", desc: "Quando o aluno atinge uma quantidade mínima de pontos (considera pontos totais do aluno, ganhos em qualquer área)", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
};

export const ACTION_META: Record<string, { short: string; icon: string; desc: string }> = {
  UNLOCK_MODULE: { short: "Liberar módulo", desc: "Desbloqueia um módulo para o aluno", icon: "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" },
  SEND_EMAIL: { short: "Enviar email", desc: "Envia um email ao aluno", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  ENROLL_COURSE: { short: "Matricular curso", desc: "Matricula em outro curso", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  SEND_PUSH: { short: "Enviar push", desc: "Envia notificação push ao aluno", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
  ADD_TAG: { short: "Adicionar tag", desc: "Atribui uma tag ao aluno", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" },
};

export const VALID_ACTIONS_FOR_TRIGGER: Record<string, string[]> = {
  MODULE_COMPLETED: ["UNLOCK_MODULE", "SEND_EMAIL", "ENROLL_COURSE", "SEND_PUSH", "ADD_TAG"],
  COURSE_COMPLETED: ["SEND_EMAIL", "ENROLL_COURSE", "SEND_PUSH", "ADD_TAG"],
  LESSON_COMPLETED: ["SEND_EMAIL", "UNLOCK_MODULE", "ENROLL_COURSE", "SEND_PUSH", "ADD_TAG"],
  QUIZ_PASSED: ["SEND_EMAIL", "UNLOCK_MODULE", "ENROLL_COURSE", "SEND_PUSH", "ADD_TAG"],
  STUDENT_ENROLLED: ["SEND_EMAIL", "ENROLL_COURSE", "SEND_PUSH", "ADD_TAG"],
  STUDENT_INACTIVE: ["SEND_EMAIL", "SEND_PUSH", "ADD_TAG"],
  STUDENT_NEVER_ACCESSED: ["SEND_EMAIL", "SEND_PUSH", "ADD_TAG"],
  PROGRESS_BELOW: ["SEND_EMAIL", "SEND_PUSH", "ADD_TAG"],
  PROGRESS_ABOVE: ["SEND_EMAIL", "SEND_PUSH", "ADD_TAG"],
  MODULE_NOT_STARTED: ["SEND_EMAIL", "SEND_PUSH", "ADD_TAG"],
  HAS_TAG: ["SEND_EMAIL", "ENROLL_COURSE", "UNLOCK_MODULE", "SEND_PUSH", "ADD_TAG"],
  POINTS_REACHED: ["ENROLL_COURSE", "UNLOCK_MODULE", "SEND_EMAIL", "SEND_PUSH", "ADD_TAG"],
};

export const GLOBAL_TRIGGERS = ["STUDENT_INACTIVE", "STUDENT_NEVER_ACCESSED", "HAS_TAG"];
export const EVENT_TRIGGERS = ["STUDENT_ENROLLED", "LESSON_COMPLETED", "MODULE_COMPLETED", "COURSE_COMPLETED", "QUIZ_PASSED", "POINTS_REACHED"];

export const NODE_W = 240;
export const NODE_H = 120;
export const START_R = 24;
