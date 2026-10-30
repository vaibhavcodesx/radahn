import { ActivityView } from "@/components/activity/ActivityView";
import { requirePageUser } from "@/server/auth/session";

export const metadata = { title: "Activity" };

export default async function ActivityPage() {
  await requirePageUser();
  return <ActivityView />;
}
