import { getCurrentUser } from '@/utils/firebase/auth';
import { getUserDashboardData } from '@/app/actions/user-actions';
import PlannerClient from './planner-client';

export default async function Home() {
  // Check if user is authenticated
  const user = await getCurrentUser();

  // If authenticated, fetch user data
  let initialData = null;
  if (user) {
    const result = await getUserDashboardData();
    if (result.success) {
      initialData = result.data;
    }
  }

  // Render the planner (works with or without auth)
  return <PlannerClient initialData={initialData} />;
}
