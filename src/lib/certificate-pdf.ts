import { jsPDF } from "jspdf";
import { createHash } from "crypto";

interface CertificateData {
  studentName: string;
  courseTitle: string;
  issuedAt: Date;
  code: string;
  verifyUrl: string;
}

export function buildCertificatePdf(data: CertificateData): Buffer {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Background
  doc.setFillColor(15, 23, 42); // slate-900 feel but printed light — we want a light cert
  // Use a light off-white background for printing readability
  doc.setFillColor(250, 249, 245);
  doc.rect(0, 0, W, H, "F");

  // Outer decorative double border
  doc.setDrawColor(37, 99, 235); // blue-600
  doc.setLineWidth(3);
  doc.rect(24, 24, W - 48, H - 48);
  doc.setLineWidth(0.8);
  doc.rect(36, 36, W - 72, H - 72);

  // Corner ornaments
  const corners: Array<[number, number]> = [
    [36, 36],
    [W - 36, 36],
    [36, H - 36],
    [W - 36, H - 36],
  ];
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(1.2);
  for (const [cx, cy] of corners) {
    doc.circle(cx, cy, 6);
  }

  // Logo / brand
  doc.setFont("helvetica", "bold");
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(24);
  doc.text("Members Club", W / 2, 90, { align: "center" });

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(1);
  doc.line(W / 2 - 40, 100, W / 2 + 40, 100);

  // Title
  doc.setFont("times", "bold");
  doc.setTextColor(17, 24, 39); // near black
  doc.setFontSize(42);
  doc.text("Certificado de Conclusão", W / 2, 170, { align: "center" });

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setTextColor(75, 85, 99);
  doc.setFontSize(14);
  doc.text("Este certificado é concedido a", W / 2, 220, { align: "center" });

  // Student name
  doc.setFont("times", "bolditalic");
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(36);
  doc.text(data.studentName, W / 2, 280, { align: "center" });

  // Divider under name
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.8);
  doc.line(W / 2 - 180, 300, W / 2 + 180, 300);

  // Conclusion text
  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 65, 81);
  doc.setFontSize(14);
  doc.text(
    "por concluir com êxito todas as aulas e módulos do curso",
    W / 2,
    335,
    { align: "center" }
  );

  // Course title
  doc.setFont("times", "bold");
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(26);
  const courseLines = doc.splitTextToSize(data.courseTitle, W - 160);
  doc.text(courseLines, W / 2, 380, { align: "center" });

  // Date
  const dateStr = data.issuedAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(75, 85, 99);
  doc.setFontSize(12);
  doc.text(`Emitido em ${dateStr}`, W / 2, H - 110, { align: "center" });

  // Signature line (decorative)
  const sigY = H - 80;
  doc.setDrawColor(156, 163, 175);
  doc.setLineWidth(0.6);
  doc.line(W / 2 - 100, sigY, W / 2 + 100, sigY);
  doc.setFontSize(11);
  doc.setTextColor(107, 114, 128);
  doc.text("Members Club — Plataforma de Cursos", W / 2, sigY + 15, {
    align: "center",
  });

  // Verification code (bottom left)
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(`Código de verificação: ${data.code}`, 60, H - 50);
  doc.text(`Verifique em: ${data.verifyUrl}`, 60, H - 36);

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

export function generateCertificateCode(
  userId: string,
  courseId: string
): string {
  const h = createHash("sha256")
    .update(`${userId}:${courseId}`)
    .digest("hex");
  return h.slice(0, 16).toUpperCase();
}
