import { redirect } from "next/navigation";

export default function StripeRedirect() {
  redirect("/producer/settings/integrations/stripe");
}
