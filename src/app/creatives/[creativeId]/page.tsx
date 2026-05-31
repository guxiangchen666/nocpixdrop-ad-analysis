import { CreativeDetailPage } from '../../../views/CreativeDetailPage';

interface CreativeDetailRouteProps {
  params: Promise<{
    creativeId: string;
  }>;
}

export default async function CreativeDetailRoute({ params }: CreativeDetailRouteProps) {
  const { creativeId } = await params;
  return <CreativeDetailPage creativeId={creativeId} />;
}
