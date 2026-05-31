import { AssetDetailPage } from '../../../views/AssetDetailPage';

interface AssetDetailRouteProps {
  params: Promise<{
    assetGroupKey: string;
  }>;
}

export default async function AssetDetailRoute({ params }: AssetDetailRouteProps) {
  const { assetGroupKey } = await params;
  return <AssetDetailPage assetGroupKey={assetGroupKey} />;
}
