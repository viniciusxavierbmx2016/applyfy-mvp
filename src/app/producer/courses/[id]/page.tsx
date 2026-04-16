import { redirect } from "next/navigation";

export default function CourseAdminIndex({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/producer/courses/${params.id}/edit`);
}
