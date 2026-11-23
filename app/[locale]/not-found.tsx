import { loadPage } from '@/lib/content';

export default function NotFound() {
  const page = loadPage('he-IL', 'not-found');
  return <div id="page" data-page="not-found" dangerouslySetInnerHTML={{ __html: page?.html ?? '' }} />;
}
