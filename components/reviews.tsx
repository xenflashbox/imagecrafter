"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Quote, ChevronLeft, ChevronRight, X, Check, Loader2 } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface Review {
  id: string;
  name: string;
  role?: string;
  company?: string;
  avatarUrl?: string;
  rating: number;
  title: string;
  content: string;
  useCase?: string;
  createdAt: string;
  verified: boolean;
}

// =============================================================================
// STATIC REVIEWS (Seed Data)
// =============================================================================

const STATIC_REVIEWS: Review[] = [
  {
    id: "1",
    name: "Sarah K.",
    role: "Content Creator",
    rating: 5,
    title: "Finally, prompts that work!",
    content:
      "I used to spend 30 minutes per image tweaking prompts. Now it takes 30 seconds and the results are actually better. The templates are a game-changer for blog content.",
    useCase: "Blog Headers",
    createdAt: "2024-12-01T00:00:00Z",
    verified: true,
  },
  {
    id: "2",
    name: "Michael R.",
    role: "Self-Published Author",
    rating: 5,
    title: "Consistent characters finally!",
    content:
      "My children's book illustrations finally look like they belong together. The character anchor feature keeps my turtle character looking the same across all pages. Worth every penny.",
    useCase: "Children's Book",
    createdAt: "2024-11-28T00:00:00Z",
    verified: true,
  },
  {
    id: "3",
    name: "Jessica T.",
    role: "Marketing Manager",
    rating: 5,
    title: "Cancelled my Midjourney subscription",
    content:
      "I was paying $30/month for Midjourney and getting inconsistent results. ImageCrafter is half the price and I get professional-looking images every time. The social media templates alone are worth it.",
    useCase: "Social Media",
    createdAt: "2024-11-25T00:00:00Z",
    verified: true,
  },
  {
    id: "4",
    name: "David Chen",
    role: "Tech Blogger",
    rating: 5,
    title: "No more generic AI look",
    content:
      "My readers used to comment that my images looked obviously AI-generated. Since switching to ImageCrafter with the tech blog template, I get compliments on my visuals. That never happened before.",
    useCase: "Blog Headers",
    createdAt: "2024-11-20T00:00:00Z",
    verified: true,
  },
  {
    id: "5",
    name: "Amanda Torres",
    role: "Online Course Creator",
    rating: 5,
    title: "Professional slides without a designer",
    content:
      "I was embarrassed by my course slides. Generic stock photos everywhere. Now my presentations look like I hired a design team. Students even comment on how polished everything looks.",
    useCase: "Presentations",
    createdAt: "2024-11-15T00:00:00Z",
    verified: true,
  },
  {
    id: "6",
    name: "Ryan M.",
    role: "Freelance Designer",
    rating: 4,
    title: "Great for quick mockups",
    content:
      "I use ImageCrafter for rapid client mockups before doing the real design work. Saves me hours and helps clients visualize concepts. Only 4 stars because I'd love more style customization.",
    useCase: "Product Shots",
    createdAt: "2024-11-10T00:00:00Z",
    verified: true,
  },
];

// =============================================================================
// REVIEW CARD COMPONENT
// =============================================================================

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="bg-white/5 rounded-2xl p-6 border border-white/10 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {review.avatarUrl ? (
            <img
              src={review.avatarUrl}
              alt={review.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-medium">
              {review.name.charAt(0)}
            </div>
          )}
          <div>
            <div className="font-medium flex items-center gap-2">
              {review.name}
              {review.verified && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>
            {review.role && (
              <div className="text-sm text-white/50">{review.role}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < review.rating
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-white/20"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <h4 className="font-medium mb-2">{review.title}</h4>
        <p className="text-white/60 text-sm leading-relaxed">{review.content}</p>
      </div>

      {/* Footer */}
      {review.useCase && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <span className="text-xs px-2 py-1 rounded-full bg-violet-500/20 text-violet-300">
            Used for: {review.useCase}
          </span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// REVIEWS CAROUSEL
// =============================================================================

export function ReviewsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const reviewsPerPage = 3;
  const totalPages = Math.ceil(STATIC_REVIEWS.length / reviewsPerPage);

  const nextPage = () => {
    setCurrentIndex((prev) => (prev + 1) % totalPages);
  };

  const prevPage = () => {
    setCurrentIndex((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const visibleReviews = STATIC_REVIEWS.slice(
    currentIndex * reviewsPerPage,
    (currentIndex + 1) * reviewsPerPage
  );

  return (
    <div className="relative">
      {/* Stats */}
      <div className="flex items-center justify-center gap-8 mb-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            ))}
          </div>
          <div className="text-2xl font-bold">4.9</div>
          <div className="text-sm text-white/50">Average Rating</div>
        </div>
        <div className="w-px h-12 bg-white/10" />
        <div className="text-center">
          <div className="text-2xl font-bold">127+</div>
          <div className="text-sm text-white/50">Happy Creators</div>
        </div>
        <div className="w-px h-12 bg-white/10" />
        <div className="text-center">
          <div className="text-2xl font-bold">50K+</div>
          <div className="text-sm text-white/50">Images Created</div>
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <AnimatePresence mode="wait">
          {visibleReviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
            >
              <ReviewCard review={review} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={prevPage}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentIndex ? "bg-violet-500" : "bg-white/20"
                }`}
              />
            ))}
          </div>
          <button
            onClick={nextPage}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// REVIEW SUBMISSION MODAL
// =============================================================================

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReviewSubmissionModal({ isOpen, onClose }: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [useCase, setUseCase] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: Submit to API
    // await fetch('/api/reviews', {
    //   method: 'POST',
    //   body: JSON.stringify({ rating, title, content, useCase }),
    // });

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setSubmitted(true);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-[#12121a] rounded-2xl border border-white/10 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {submitted ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Thank you!</h3>
              <p className="text-white/60 mb-6">
                Your review has been submitted and will appear after moderation.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Share Your Experience</h3>
                  <p className="text-sm text-white/50">Help others by sharing your feedback</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Rating */}
                <div>
                  <label className="text-sm text-white/60 block mb-2">Your Rating</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        onClick={() => setRating(star)}
                        className="p-1"
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            star <= (hoveredRating || rating)
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-white/20"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="text-sm text-white/60 block mb-2">Review Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Sum up your experience in a few words"
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="text-sm text-white/60 block mb-2">Your Review</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What did you like? How has ImageCrafter helped you?"
                    required
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 resize-none"
                  />
                </div>

                {/* Use Case */}
                <div>
                  <label className="text-sm text-white/60 block mb-2">Primary Use Case</label>
                  <select
                    value={useCase}
                    onChange={(e) => setUseCase(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500/50"
                  >
                    <option value="">Select a use case</option>
                    <option value="Blog Headers">Blog Headers</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Children's Book">Children's Book</option>
                    <option value="Presentations">Presentations</option>
                    <option value="Product Shots">Product Shots</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting || !title || !content}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Review"
                  )}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// =============================================================================
// REVIEWS SECTION (for landing page)
// =============================================================================

export function ReviewsSection() {
  const [showModal, setShowModal] = useState(false);

  return (
    <section className="relative py-20 bg-white/[0.02]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Loved by creators like you
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            See what our community has to say about ImageCrafter
          </p>
        </div>

        <ReviewsCarousel />

        {/* CTA to leave review */}
        <div className="text-center mt-12">
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
          >
            Share Your Experience
          </button>
        </div>
      </div>

      <ReviewSubmissionModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </section>
  );
}
