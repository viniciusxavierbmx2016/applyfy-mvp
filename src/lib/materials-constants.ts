// Allow-list + teto de tamanho dos materiais de aula, importado pela rota de
// upload (server) E pelo componente LessonMaterials (client) — fonte única,
// não divergem. (O bucket "materials" aceita qualquer MIME; esta é a única
// barreira de tipo/tamanho.)
export const MATERIALS_ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "audio/mpeg",
  "video/mp4",
  "text/plain",
  "text/csv",
]);

export const MATERIALS_MAX_SIZE = 50 * 1024 * 1024; // 50MB
