import React, { useState } from 'react';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  Star,
  Award,
  Users,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Phone,
  Mail,
  Send,
  User
} from 'lucide-react';
import { Modal } from '../common/Modal';

const CoachAvatar = ({ src, alt, className = "w-14 h-14 rounded-2xl", iconClassName = "w-7 h-7 text-teal-600" }) => {
  const [hasError, setHasError] = useState(false);
  if (!src || hasError) {
    return (
      <div className={`${className} bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0`}>
        <User className={iconClassName} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt || "Coach"}
      className={`${className} object-cover shrink-0`}
      onError={() => setHasError(true)}
    />
  );
};

export const CoachesDirectory = () => {
  const { trainers = [], trainerReviews = [], addTrainerReview, addToast } = useGymData();
  const { currentUser } = useAuth();

  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!selectedTrainer) return;

    addTrainerReview({
      trainerId: selectedTrainer.id,
      trainerName: selectedTrainer.name,
      memberId: currentUser?.id || 'mem-5',
      memberName: currentUser?.name || 'Athlete Member',
      rating,
      comment
    });

    setIsReviewModalOpen(false);
    setRating(5);
    setComment('');
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-12 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-200">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
              Gym Coaches & Personal Trainers
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Browse top coaches in the club, view verified member ratings, and share your personal training feedback.
            </p>
          </div>
        </div>
      </div>

      {/* Coaches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trainers.map((trn) => {
          const reviews = trainerReviews.filter((r) => r.trainerId === trn.id);
          const reviewCount = reviews.length;

          return (
            <div
              key={trn.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CoachAvatar
                    src={trn.avatar}
                    alt={trn.name}
                    className="w-14 h-14 rounded-2xl shadow-xs"
                    iconClassName="w-7 h-7 text-teal-600"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                      {trn.specialty}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1 truncate">{trn.name}</h3>
                    <div className="flex items-center gap-1 mt-1 text-xs">
                      <div className="flex text-amber-400">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= Math.round(Number(trn.rating) || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-black text-slate-900 ml-1 text-xs">
                        {trn.rating || 5.0}
                      </span>
                      <span className="text-[10px] text-slate-400">({reviewCount} reviews)</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {trn.bio || 'Certified fitness specialist focused on strength, mobility, and athlete conditioning.'}
                </p>

                <div className="flex flex-wrap gap-1">
                  {(trn.certifications || ['NASM-CPT', 'CrossFit L1']).map((cert, idx) => (
                    <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {cert}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTrainer(trn)}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer text-center"
                >
                  View Reviews ({reviewCount})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTrainer(trn);
                    setIsReviewModalOpen(true);
                  }}
                  className="py-1.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                >
                  <Star className="w-3.5 h-3.5 fill-white" />
                  <span>Rate Coach</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* REVIEWS DRAWER MODAL */}
      <Modal
        isOpen={Boolean(selectedTrainer && !isReviewModalOpen)}
        onClose={() => setSelectedTrainer(null)}
        title={`Reviews & Ratings: ${selectedTrainer?.name || ''}`}
        maxWidth="max-w-md"
      >
        {selectedTrainer && (
          <div className="space-y-3.5 text-xs">
            <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CoachAvatar
                  src={selectedTrainer.avatar}
                  alt={selectedTrainer.name}
                  className="w-10 h-10 rounded-xl"
                  iconClassName="w-5 h-5 text-teal-600"
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{selectedTrainer.name}</h4>
                  <div className="text-[10px] text-teal-800">{selectedTrainer.specialty}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end text-amber-500 font-bold">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span className="text-sm font-black text-slate-900">{selectedTrainer.rating || 5.0}</span>
                </div>
                <div className="text-[10px] text-slate-400">Score from Athletes</div>
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {trainerReviews.filter((r) => r.trainerId === selectedTrainer.id).length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  No written reviews yet for this coach. Be the first to share your feedback!
                </div>
              ) : (
                trainerReviews
                  .filter((r) => r.trainerId === selectedTrainer.id)
                  .map((rev) => (
                    <div key={rev.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{rev.memberName}</span>
                        <div className="flex text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-700 leading-relaxed italic">"{rev.comment}"</p>
                      <span className="text-[9px] text-slate-400 block font-mono">{rev.date}</span>
                    </div>
                  ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsReviewModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Star className="w-4 h-4 fill-white" />
              <span>Write a Review for {selectedTrainer.name.split(' ')[0]}</span>
            </button>
          </div>
        )}
      </Modal>

      {/* WRITE REVIEW MODAL */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={`Review ${selectedTrainer?.name || 'Coach'}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleReviewSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Select Rating (1 to 5 Stars)</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  className="p-1 cursor-pointer transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    className={`w-7 h-7 ${
                      s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 font-bold text-slate-700 text-sm">{rating} / 5 Stars</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Your Review & Coaching Feedback</label>
            <textarea
              required
              rows={4}
              placeholder="Describe your workout experience, form corrections, discipline, motivation..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsReviewModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Review</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
