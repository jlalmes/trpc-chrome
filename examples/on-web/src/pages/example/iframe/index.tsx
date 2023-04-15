import RequestResponseList from '../../../components/ReqResViz';

export default function Popup() {
  return (
    <main className="flex min-h-screen flex-col items-center p-24 gap-24">
      <h1 className="text-6xl font-bold">Welcome to the iframe example</h1>

      {/* 1 big button "send request" */}
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={() => {
          // TODO
        }}
      >
        send request
      </button>

      <div className="flex space-x-4">
        <RequestResponseList />

        {/* styled iframe container */}
        <div className="shadow-md rounded-md p-4 h-64 w-full overflow-y-auto border-2 border-gray-200">
          <iframe src="/example/iframe/embedded" className="w-full h-full" />
        </div>
      </div>
    </main>
  );
}
