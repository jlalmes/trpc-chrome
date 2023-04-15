import RequestResponseList from '../../../components/MessageList';

export default function Iframe() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-2">
      <h3 className="text-xl font-bold">This is the iframe</h3>
      <RequestResponseList />
    </main>
  );
}
