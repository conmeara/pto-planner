import { createClient } from '@/utils/supabase/server';
import { getUserDashboardData } from '@/app/actions/user-actions';
import PlannerClient from './planner-client';

export default async function Home() {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
