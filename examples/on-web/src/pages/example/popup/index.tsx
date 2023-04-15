import RequestResponseList from '../../../components/ReqResViz';

export default function Popup() {
  return (
    <main className="flex min-h-screen flex-col items-center p-24 gap-24">
      <h1 className="text-6xl font-bold">Welcome to the popup example</h1>

      {/* 1 big button "send request" */}
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={() => {
          // TODO
        }}
      >
        send request
      </button>

      <RequestResponseList />
    </main>
  );
}
