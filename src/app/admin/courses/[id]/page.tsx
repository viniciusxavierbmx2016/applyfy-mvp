import { redirect } from "next/navigation";

export default function CourseAdminIndex({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/admin/courses/${params.id}/edit`);
}
