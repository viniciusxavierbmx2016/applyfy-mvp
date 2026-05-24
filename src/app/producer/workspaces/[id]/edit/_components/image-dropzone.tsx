"use client";

export function ImageDropzone({
  label,
  dimensions,
  imageUrl,
  imageIsFallback,
  uploading,
  fallbackColor,
  onPick,
  onRemove,
  initial,
}: {
  label: string;
  dimensions: string;
  imageUrl: string | null;
  imageIsFallback?: boolean;
  uploading: boolean;
  fallbackColor?: string | null;
  onPick: () => void;
  onRemove?: () => void;
  initial?: string;
}) {
  const hasImage = !!imageUrl;
  return (
    <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-gray-600 dark:text-gray-400">
          {label}
        </p>
        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-100 dark:bg-white/5 text-gray-500 rounded">
          {dimensions}
        </span>
      </div>
      {hasImage ? (
        <div className="relative group">
          <div
            className="w-full h-[120px] rounded-lg bg-cover bg-center border border-gray-200 dark:border-white/10"
            style={
              imageUrl
                ? { backgroundImage: `url(${imageUrl})` }
                : fallbackColor
                  ? { backgroundColor: fallbackColor }
                  : {}
            }
          />
          {imageIsFallback && (
            <span className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 bg-black/60 text-white rounded">
              Usando logo do workspace
            </span>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition rounded-lg flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={onPick}
              disabled={uploading}
              className="px-3 py-1.5 text-xs font-medium bg-white/90 hover:bg-white text-gray-900 rounded disabled:opacity-50"
            >
              {uploading ? "Enviando..." : "Trocar"}
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="px-3 py-1.5 text-xs font-medium bg-red-500/90 hover:bg-red-500 text-white rounded"
              >
                Remover
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onPick}
          disabled={uploading}
          className="w-full h-[120px] rounded-lg border-2 border-dashed border-gray-300 dark:border-white/10 hover:border-primary dark:hover:border-primary hover:bg-primary/5 transition flex flex-col items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {initial && !imageUrl ? (
            <span className="text-2xl font-bold text-gray-400">{initial}</span>
          ) : (
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          )}
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {uploading ? "Enviando..." : "Arraste ou clique para enviar"}
          </span>
        </button>
      )}
    </div>
  );
}
