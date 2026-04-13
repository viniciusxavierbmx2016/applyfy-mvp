"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { StarRating } from "@/components/star-rating";
import { formatRelativeTime } from "@/lib/utils";

interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
}

interface Props {
  courseId: string;
  initialAverage: number;
  initialCount: number;
  myReview: { rating: number; comment: string | null } | null;
  canReview: boolean;
}

export function ReviewsSection({
  courseId,
  initialAverage,
  initialCount,
  myReview,
  canReview,
}: Props) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [average, setAverage] = useState(initialAverage);
  const [count, setCount] = useState(initialCount);

  const [rating, setRating] = useState(myReview?.rating ?? 0);
  const [comment, setComment] = useState(myReview?.comment ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/courses/${courseId}/reviews?page=1`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setReviews(data.reviews || []);
        setAverage(data.average ?? 0);
        setCount(data.count ?? 0);
        setHasMore(Boolean(data.hasMore));
        setPage(1);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  async function loadMore() {
    const next = page + 1;
    const res = await fetch(`/api/courses/${courseId}/reviews?page=${next}`);
    if (!res.ok) return;
    const data = await res.json();
    setReviews((prev) => [...prev, ...(data.reviews || [])]);
    setPage(next);
    setHasMore(Boolean(data.hasMore));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    if (rating < 1 || rating > 5) {
      setFormError("Escolha uma nota de 1 a 5");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Erro ao enviar avaliação");
        return;
      }
      const refreshed = await fetch(
        `/api/courses/${courseId}/reviews?page=1`
      ).then((r) => r.json());
      setReviews(refreshed.reviews || []);
      setAverage(refreshed.average ?? 0);
      setCount(refreshed.count ?? 0);
      setHasMore(Boolean(refreshed.hasMore));
      setPage(1);
      setFormSuccess("Avaliação enviada. Obrigado!");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Avaliações</h2>
          <div className="flex items-center gap-2 mt-1">
            <StarRating value={average} size="md" />
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              {average > 0 ? average.toFixed(1) : "—"}
            </span>
            <span className="text-sm text-gray-500">
              ({count} avaliaç{count === 1 ? "ão" : "ões"})
            </span>
          </div>
        </div>
      </div>

      {canReview && (
        <form
          onSubmit={submit}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-5 mb-5"
        >
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-medium">
            {myReview ? "Atualize sua avaliação" : "Avalie este curso"}
          </p>
          <StarRating value={rating} size="lg" onChange={setRating} />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Conte sua experiência (opcional)"
            rows={3}
            maxLength={2000}
            className="w-full mt-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />
          {formError && (
            <p className="mt-2 text-xs text-red-400">{formError}</p>
          )}
          {formSuccess && (
            <p className="mt-2 text-xs text-green-400">{formSuccess}</p>
          )}
          <div className="flex justify-end mt-3">
            <button
              type="submit"
              disabled={submitting || rating < 1}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {submitting
                ? "Enviando..."
                : myReview
                  ? "Atualizar"
                  : "Enviar avaliação"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Carregando avaliações...</p>
      ) : reviews.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-500">
            Ainda não há avaliações. {canReview && "Seja o primeiro!"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <Avatar src={r.user.avatarUrl} name={r.user.name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-gray-900 dark:text-white font-medium text-sm">
                      {r.user.name}
                    </span>
                    <StarRating value={r.rating} size="sm" />
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(new Date(r.createdAt))}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1.5 whitespace-pre-wrap break-words">
                      {r.comment}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {hasMore && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={loadMore}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Ver mais avaliações
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
