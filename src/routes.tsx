import type { RouteConfig } from '@/types/route';
import LoginPage from '@/pages/LoginPage';
import HomePage from '@/pages/HomePage';
import DashboardPage from '@/pages/DashboardPage';
import VideoCreatePage from '@/pages/VideoCreatePage';
import VideoEditPage from '@/pages/VideoEditPage';
import WorksPage from '@/pages/WorksPage';
import MaterialsPage from '@/pages/MaterialsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import ProfilePage from '@/pages/ProfilePage';
import CompetitorPage from '@/pages/CompetitorPage';
import LiveHighlightPage from '@/pages/LiveHighlightPage';
import InvitePage from '@/pages/InvitePage';
import ActivitiesPage from '@/pages/ActivitiesPage';
import BatchCreatePage from '@/pages/BatchCreatePage';

const routes: RouteConfig[] = [
  { path: '/login', component: LoginPage, isPublic: true },
  { path: '/home', component: HomePage },
  { path: '/', component: DashboardPage },
  { path: '/video/create', component: HomePage },
  { path: '/video/create/:projectId', component: HomePage },
  { path: '/video/edit', component: VideoEditPage },
  { path: '/video/edit/:projectId', component: VideoEditPage },
  { path: '/works', component: WorksPage },
  { path: '/materials', component: MaterialsPage },
  { path: '/analytics', component: AnalyticsPage },
  { path: '/profile', component: ProfilePage },
  { path: '/competitor', component: CompetitorPage },
  { path: '/live-highlight', component: LiveHighlightPage },
  { path: '/invite', component: InvitePage },
  { path: '/activities', component: ActivitiesPage },
  { path: '/batch-create', component: BatchCreatePage },
];

export default routes;
