"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] px-4">
      <div className="text-center max-w-sm">
        <div className="mx-auto w-20 h-20 rounded-full bg-gray-800/50 flex items-center justify-center mb-6">
          <svg
            className="w-10 h-10 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0"
            />
            <line
              x1="3"
              y1="3"
              x2="21"
              y2="21"
              strokeLinecap="round"
              strokeWidth={2}
              className="text-red-400"
              stroke="currentColor"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Sem conexão</h1>
        <p className="text-gray-400 mb-8">
          Verifique sua internet e tente novamente.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
