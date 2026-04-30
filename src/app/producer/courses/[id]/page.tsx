import { redirect } from "next/navigation";

export default async function CourseAdminIndex(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  redirect(`/producer/courses/${params.id}/edit`);
}
