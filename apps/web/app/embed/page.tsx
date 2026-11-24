import { EmbedPanel } from '../../components/embed/embed-panel';

type EmbedPageProps = {
  searchParams: Promise<{ key?: string | string[] }>;
};

export default async function EmbedPage({ searchParams }: EmbedPageProps) {
  const { key } = await searchParams;
  const publicKey = typeof key === 'string' ? key : '';

  return <EmbedPanel publicKey={publicKey} />;
}
