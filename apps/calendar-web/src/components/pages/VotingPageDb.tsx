import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  IconBoxMultiple,
  IconCheck,
  IconSquare,
  IconConfetti,
} from "@tabler/icons-react";
import { useAuth } from "../../contexts/AuthContext";
import { usePoll } from "../../hooks/usePoll";
import { api } from "../../utils/api";
import { NotificationTemplates } from "../../utils/notifications";
import { setVotingPageMeta, resetMetaTags } from "../../utils/metaTags";
import Card from "../shared/Card";
import Button from "../shared/Button";
import Modal from "../shared/Modal";
import LoadingState from "../shared/LoadingState";
import ErrorState from "../shared/ErrorState";

export default function VotingPageDb() {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { poll, loading: isLoading, error: loadError } = usePoll(pollId);

  // Voting state
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { state: { from: { pathname: `/vote/${pollId}` } } });
    }
  }, [authLoading, user, navigate, pollId]);

  // Update meta tags for link preview
  useEffect(() => {
    if (poll) {
      setVotingPageMeta(poll.title, pollId || "");
    }
    return () => {
      resetMetaTags();
    };
  }, [poll, pollId]);

  const handleSubmitVote = async () => {
    if (!user) {
      setSubmitError("Please log in to vote");
      return;
    }

    if (selectedOptions.length === 0) {
      setSubmitError("Please select at least one option");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await api.post(
        `/polls/${pollId}/vote`,
        {
          availableOptionIds: selectedOptions,
          maybeOptionIds: [],
          notes: notes.trim() || undefined,
        },
        true, // requireAuth
      );

      setShowSuccessModal(true);
      // Show notification
      if (poll) {
        NotificationTemplates.voteSubmitted(poll.title, pollId || "");
      }
    } catch (error) {
      console.error("Failed to submit vote:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit vote",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleOption = (optionId: string) => {
    setSelectedOptions((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId],
    );
  };

  if (isLoading) {
    return <LoadingState message="Loading event..." />;
  }

  if (loadError || !poll) {
    return (
      <ErrorState
        error={loadError || "Event not found"}
        onGoHome={() => navigate("/")}
      />
    );
  }

  if (poll.status === "CANCELLED") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sand-50 to-ocean-50 p-4 flex items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Event Cancelled
          </h2>
          <p className="text-gray-600 mb-4">
            This event has been cancelled by the organizer.
          </p>
          <Button onClick={() => navigate("/")}>Return Home</Button>
        </Card>
      </div>
    );
  }

  const sortedOptions = [...poll.options].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sand-50 to-ocean-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <div className="flex items-start gap-4">
            <IconBoxMultiple
              size={48}
              className="text-ocean-600 flex-shrink-0"
            />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-ocean-600 mb-2">
                {poll.title}
              </h1>
              {poll.description && (
                <p className="text-gray-600 mb-2">{poll.description}</p>
              )}
              <p className="text-sm text-gray-500">
                Created by {poll.creatorName}
              </p>
              {poll.votingDeadline && (
                <p className="text-sm text-coral-500 mt-1">
                  Voting ends:{" "}
                  {new Date(poll.votingDeadline).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Options */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Select Your Availability
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Click to mark when you're available. Click again to deselect.
          </p>
          <div className="space-y-3">
            {sortedOptions.map((option) => {
              const isAvailable = selectedOptions.includes(option.id);

              return (
                <button
                  key={option.id}
                  onClick={() => toggleOption(option.id)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left cursor-pointer ${
                    isAvailable
                      ? "border-seaweed-500 bg-seaweed-50"
                      : "border-gray-200 hover:border-ocean-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-800">
                        {option.label}
                      </div>
                      {option.description && (
                        <div className="text-sm text-gray-600 mt-1">
                          {option.description}
                        </div>
                      )}
                      {option.date && (
                        <div className="text-sm text-gray-500 mt-1">
                          {new Date(option.date).toLocaleDateString()}
                          {option.timeStart && ` at ${option.timeStart}`}
                          {option.timeEnd && ` - ${option.timeEnd}`}
                        </div>
                      )}
                    </div>
                    <div className="text-2xl">
                      {isAvailable ? (
                        <IconCheck size={32} className="text-seaweed-600" />
                      ) : (
                        <IconSquare size={32} className="text-gray-400" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Notes */}
        <Card className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional comments..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
          />
        </Card>

        {/* Submit */}
        {submitError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {submitError}
          </div>
        )}

        <Button
          onClick={handleSubmitVote}
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "Submitting..." : "Submit Vote"}
        </Button>

        {/* Success Modal */}
        {showSuccessModal && (
          <Modal
            isOpen={showSuccessModal}
            onClose={() => {
              setShowSuccessModal(false);
              navigate(`/results/${pollId}`);
            }}
            title="Vote Submitted!"
          >
            <div className="text-center">
              <IconConfetti
                size={64}
                className="mx-auto mb-4 text-seaweed-600"
              />
              <p className="text-gray-700 mb-6">
                Your vote has been recorded successfully!
              </p>
              <Button onClick={() => navigate(`/results/${pollId}`)}>
                View Results
              </Button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
