export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-24 gap-24">
      <h1 className="text-6xl font-bold">Welcome to trpc-chrome!</h1>
      {/* 2 big button links which go to either the "iframe example" or the "popup example" */}
      <div className="flex space-x-4">
        <a
          href="/example/iframe"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          iframe example
        </a>
        <a
          href="/example/popup"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          popup example
        </a>
      </div>
    </main>
  );
}
