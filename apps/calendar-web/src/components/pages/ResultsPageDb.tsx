import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  IconChartBar,
  IconTrophy,
  IconCheck,
  IconLockOpen,
  IconBoxMultiple,
  IconHome,
  IconChecklist,
  IconSquare,
} from "@tabler/icons-react";
import { useAuth } from "../../contexts/AuthContext";
import { usePoll } from "../../hooks/usePoll";
import { api } from "../../utils/api";
import { NotificationTemplates } from "../../utils/notifications";
import { setResultsPageMeta, resetMetaTags } from "../../utils/metaTags";
import Card from "../shared/Card";
import Button from "../shared/Button";
import Modal from "../shared/Modal";
import LoadingState from "../shared/LoadingState";
import ErrorState from "../shared/ErrorState";

interface OptionResult {
  optionId: string;
  label: string;
  availableCount: number;
  maybeCount: number;
  availablePercentage: number;
  maybePercentage: number;
}

interface VoteResults {
  totalVoters: number;
  optionResults: OptionResult[];
}

export default function ResultsPageDb() {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    poll,
    loading: pollLoading,
    error: pollError,
    refetch,
  } = usePoll(pollId);

  const [results, setResults] = useState<VoteResults | null>(null);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [resultsError, setResultsError] = useState("");
  const [isReopening, setIsReopening] = useState(false);

  // Quick vote modal state
  const [showQuickVote, setShowQuickVote] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (poll) {
      calculateResults();
    }
  }, [poll]);

  // Update meta tags for link preview
  useEffect(() => {
    if (poll && results) {
      const sortedResults = [...results.optionResults].sort(
        (a, b) => b.availableCount - a.availableCount,
      );
      const topChoice = sortedResults[0]?.label;
      setResultsPageMeta(poll.title, pollId || "", topChoice);
    }
    return () => {
      resetMetaTags();
    };
  }, [poll, results, pollId]);

  const calculateResults = () => {
    if (!poll) return;

    setResultsLoading(true);
    setResultsError("");

    try {
      const totalVoters = poll.votes.length;
      const optionResults: OptionResult[] = poll.options.map((option) => {
        const availableCount = poll.votes.filter((vote) =>
          vote.availableOptions.includes(option.id),
        ).length;
        const maybeCount = poll.votes.filter((vote) =>
          vote.maybeOptions.includes(option.id),
        ).length;

        return {
          optionId: option.id,
          label: option.label,
          availableCount,
          maybeCount,
          availablePercentage:
            totalVoters > 0 ? (availableCount / totalVoters) * 100 : 0,
          maybePercentage:
            totalVoters > 0 ? (maybeCount / totalVoters) * 100 : 0,
        };
      });

      setResults({ totalVoters, optionResults });
    } catch (error) {
      console.error("Failed to calculate results:", error);
      setResultsError(
        error instanceof Error ? error.message : "Failed to calculate results",
      );
    } finally {
      setResultsLoading(false);
    }
  };

  const handleReopen = async () => {
    if (!pollId) return;

    setIsReopening(true);

    try {
      await api.post(`/polls/${pollId}/reopen`, { days: 7 }, true);
      // Force refresh to show updated poll status
      window.location.reload();
    } catch (error) {
      console.error("Failed to reopen poll:", error);
      alert(error instanceof Error ? error.message : "Failed to reopen poll");
    } finally {
      setIsReopening(false);
    }
  };

  const handleQuickVote = () => {
    if (!user) {
      navigate("/login", {
        state: { from: { pathname: `/results/${pollId}` } },
      });
      return;
    }
    setShowQuickVote(true);
  };

  const toggleOption = (optionId: string) => {
    setSelectedOptions((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId],
    );
  };

  const handleSubmitVote = async () => {
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
          notes: undefined,
        },
        true,
      );

      // Show notification
      if (poll) {
        NotificationTemplates.voteSubmitted(poll.title, pollId || "");
      }

      // Reload poll data (results will be recalculated automatically)
      await refetch();
      setShowQuickVote(false);
      setSelectedOptions([]);
    } catch (error) {
      console.error("Failed to submit vote:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit vote",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = pollLoading || resultsLoading;
  const loadError = pollError || resultsError;

  if (isLoading) {
    return <LoadingState message="Loading results..." />;
  }

  if (loadError || !poll || !results) {
    return (
      <ErrorState
        error={loadError || "Results not found"}
        onGoHome={() => navigate("/")}
      />
    );
  }

  // Sort results by available count (descending)
  const sortedResults = [...results.optionResults].sort(
    (a, b) => b.availableCount - a.availableCount,
  );

  const topOption = sortedResults[0];
  const isCreator = user && poll.creatorId === user.id;
  const canReopen =
    isCreator && (poll.status === "FINALIZED" || poll.status === "CANCELLED");

  return (
    <div className="min-h-screen bg-gradient-to-br from-sand-50 to-ocean-50 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <div className="flex items-start gap-4">
            <IconChartBar size={48} className="text-ocean-600 flex-shrink-0" />
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
              <div className="mt-3 flex items-center gap-4 text-sm">
                <span className="text-seaweed-600 font-medium">
                  {results.totalVoters}{" "}
                  {results.totalVoters === 1 ? "vote" : "votes"}
                </span>
                {poll.status === "VOTING" && (
                  <span className="text-coral-500">Voting open</span>
                )}
                {poll.status === "FINALIZED" && (
                  <span className="text-ocean-600">
                    <IconCheck size={16} className="inline mr-1" /> Finalized
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Winner card (if votes exist) */}
        {results.totalVoters > 0 && topOption && (
          <Card className="mb-6 bg-gradient-to-br from-seaweed-50 to-ocean-50 border-2 border-seaweed-300">
            <div className="flex items-center gap-3 mb-3">
              <IconTrophy size={32} className="text-seaweed-700" />
              <h2 className="text-xl font-bold text-seaweed-700">Top Choice</h2>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="font-semibold text-lg text-gray-800 mb-1">
                {topOption.label}
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-seaweed-600 font-medium">
                  <IconCheck size={16} className="inline mr-1" />{" "}
                  {topOption.availableCount} available (
                  {topOption.availablePercentage.toFixed(0)}%)
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* All results */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            All Options
          </h2>

          {results.totalVoters === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <IconBoxMultiple
                size={48}
                className="mx-auto mb-3 text-gray-400"
              />
              <p>No votes yet. Be the first to vote!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedResults.map((result) => (
                <div
                  key={result.optionId}
                  className="border-2 border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        {result.label}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-seaweed-600">
                        {result.availableCount}{" "}
                        <IconCheck size={16} className="inline" />
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-seaweed-500 h-full transition-all duration-300"
                        style={{ width: `${result.availablePercentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-10 text-right">
                      {result.availablePercentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          {poll.status === "VOTING" && (
            <Button
              onClick={handleQuickVote}
              variant="primary"
              className="flex-1"
            >
              <IconChecklist size={18} className="inline mr-1" /> Quick Vote
            </Button>
          )}
          {canReopen && (
            <Button
              onClick={handleReopen}
              disabled={isReopening}
              variant="primary"
              className="flex-1"
            >
              <IconLockOpen size={18} className="inline mr-1" />{" "}
              {isReopening ? "Reopening..." : "Reopen Voting"}
            </Button>
          )}
          <Button onClick={() => navigate("/")} variant="outline">
            <IconHome size={18} className="inline mr-1" /> Home
          </Button>
        </div>

        {/* Quick Vote Modal */}
        {showQuickVote && poll && (
          <Modal
            isOpen={showQuickVote}
            onClose={() => {
              setShowQuickVote(false);
              setSelectedOptions([]);
              setSubmitError("");
            }}
            title="Quick Vote"
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Select when you're available:
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {poll.options
                  .sort((a, b) => a.order - b.order)
                  .map((option) => {
                    const isSelected = selectedOptions.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        onClick={() => toggleOption(option.id)}
                        className={`w-full p-3 rounded-lg border-2 transition-all text-left cursor-pointer ${
                          isSelected
                            ? "border-seaweed-500 bg-seaweed-50"
                            : "border-gray-200 hover:border-ocean-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-800">
                              {option.label}
                            </div>
                            {option.date && (
                              <div className="text-sm text-gray-500 mt-1">
                                {new Date(option.date).toLocaleDateString()}
                                {option.timeStart && ` at ${option.timeStart}`}
                              </div>
                            )}
                          </div>
                          <div className="text-xl ml-2">
                            {isSelected ? (
                              <IconCheck
                                size={24}
                                className="text-seaweed-600"
                              />
                            ) : (
                              <IconSquare size={24} className="text-gray-400" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {submitError}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSubmitVote}
                  disabled={isSubmitting}
                  variant="primary"
                  className="flex-1"
                >
                  {isSubmitting ? "Submitting..." : "Submit Vote"}
                </Button>
                <Button
                  onClick={() => {
                    setShowQuickVote(false);
                    setSelectedOptions([]);
                    setSubmitError("");
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
