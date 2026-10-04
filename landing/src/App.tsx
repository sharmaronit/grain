import { Landing } from './Landing';
import { SitePage } from './SitePages';

export function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  return path === '/' ? <Landing /> : <SitePage path={path} />;
}
