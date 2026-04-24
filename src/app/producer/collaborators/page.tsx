import { redirect } from "next/navigation";

export default function CollaboratorsRedirect() {
  redirect("/producer/settings/collaborators");
}
