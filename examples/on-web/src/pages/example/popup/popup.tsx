export default function Popup() {
  return (
    <main className="flex min-h-screen flex-col items-center p-24 gap-24">
      <h1 className="text-6xl font-bold">Welcome to the popup!</h1>

      <div className="flex  flex-col space-y-4 items-center">
        <p>Response should be sent shortly</p>

        <p className="text-gray-500 text-center">
          (you can keep the popup open in the background to send more messages without reopening it,
          but you can also close it and the parent will reopen a new one when needed)
        </p>
      </div>

      {/* button to close popup */}
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={() => {
          window.close();
        }}
      >
        close popup
      </button>
    </main>
  );
}
