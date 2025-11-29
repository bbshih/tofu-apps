import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  IconList,
  IconSparkles,
  IconLoader,
  IconChecklist,
  IconChartBar,
} from "@tabler/icons-react";
import Card from "../shared/Card";
import Input from "../shared/Input";
import Button from "../shared/Button";
import Modal from "../shared/Modal";
import CopyButton from "../shared/CopyButton";
import CalendarMonthView from "../features/CalendarMonthView";
import DatePatternPresets from "../features/DatePatternPresets";
import { parseDateFromNaturalLanguage } from "../../utils/naturalLanguageDateParser";
import { NotificationTemplates } from "../../utils/notifications";
import type { DateOption } from "../../types/local";

type OptionType = "DATE" | "TEXT";

interface PollOption {
  id: string;
  optionType: OptionType;
  label: string;
  date?: string;
}

const DRAFT_KEY = "createEventDraft";

export default function CreateEventPage() {
  const navigate = useNavigate();

  const [eventTitle, setEventTitle] = useState("");
  const [description, setDescription] = useState("");
  const [optionType, setOptionType] = useState<OptionType>("DATE");
  const [dateOptions, setDateOptions] = useState<DateOption[]>([]);
  const [textOptions, setTextOptions] = useState<PollOption[]>([]);
  const [textInput, setTextInput] = useState("");
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [parseError, setParseError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [optionsError, setOptionsError] = useState("");

  // Success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdPoll, setCreatedPoll] = useState<any>(null);

  // Refs for focusing and scrolling to invalid fields
  const titleInputRef = useRef<HTMLInputElement>(null);
  const optionsCardRef = useRef<HTMLDivElement>(null);

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setEventTitle(draft.eventTitle || "");
        setDescription(draft.description || "");
        setOptionType(draft.optionType || "DATE");
        setDateOptions(draft.dateOptions || []);
        setTextOptions(draft.textOptions || []);
      } catch (error) {
        console.error("Failed to load draft:", error);
      }
    }
  }, []);

  // Auto-save draft
  useEffect(() => {
    const draft = {
      eventTitle,
      description,
      optionType,
      dateOptions,
      textOptions,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [eventTitle, description, optionType, dateOptions, textOptions]);

  const handleAddDate = (isoDate: string) => {
    const date = new Date(isoDate);
    const label = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const newOption: DateOption = {
      id: `temp-${Date.now()}-${Math.random()}`,
      date: isoDate,
      label,
    };
    setDateOptions([...dateOptions, newOption]);
    if (optionsError) setOptionsError(""); // Clear error when adding options
  };

  const handleRemoveDate = (dateId: string) => {
    setDateOptions(dateOptions.filter((opt) => opt.id !== dateId));
  };

  const handlePresetSelected = (dates: string[]) => {
    // Add preset dates to the list
    const newOptions: DateOption[] = dates.map((isoDate) => {
      const date = new Date(isoDate);
      const label = date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return {
        id: `temp-${Date.now()}-${Math.random()}`,
        date: isoDate,
        label,
      };
    });
    setDateOptions([...dateOptions, ...newOptions]);
  };

  const handleAddTextOption = () => {
    if (!textInput.trim()) return;

    const newOption: PollOption = {
      id: `temp-${Date.now()}-${Math.random()}`,
      optionType: "TEXT",
      label: textInput.trim(),
    };
    setTextOptions([...textOptions, newOption]);
    setTextInput("");
    if (optionsError) setOptionsError(""); // Clear error when adding options
  };

  const handleRemoveTextOption = (optionId: string) => {
    setTextOptions(textOptions.filter((opt) => opt.id !== optionId));
  };

  const handleParseNaturalLanguage = async () => {
    setParseError("");

    try {
      const parsed = await parseDateFromNaturalLanguage(naturalLanguageInput);

      if (parsed.length === 0) {
        setParseError(
          'Could not parse dates. Try: "tomorrow", "next week", "this weekend", "next 5 days", "12/25"',
        );
        return;
      }

      // Add parsed dates to options
      const newOptions: DateOption[] = parsed.map((isoDate) => {
        const date = new Date(isoDate);
        const label = date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        return {
          id: `temp-${Date.now()}-${Math.random()}`,
          date: isoDate,
          label,
        };
      });

      setDateOptions([...dateOptions, ...newOptions]);
      setNaturalLanguageInput("");
    } catch (error) {
      setParseError("Error parsing dates. Please try again.");
      console.error("Date parsing error:", error);
    }
  };

  const handleCreateEvent = async () => {
    // Clear previous errors
    setTitleError("");
    setOptionsError("");
    setCreateError("");

    // Validate title
    if (!eventTitle.trim()) {
      setTitleError("Please enter an event title");
      // Scroll to and focus the title input
      titleInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      titleInputRef.current?.focus();
      return;
    }

    // Validate options
    const totalOptions =
      optionType === "DATE" ? dateOptions.length : textOptions.length;
    if (totalOptions === 0) {
      setOptionsError(
        `Please add at least one ${optionType === "DATE" ? "date" : "option"}`,
      );
      // Scroll to the options section
      optionsCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsCreating(true);

    try {
      const token = localStorage.getItem("accessToken");

      // Build options based on type
      const options =
        optionType === "DATE"
          ? dateOptions.map((opt, i) => ({
              optionType: "DATE",
              label: opt.label,
              date: opt.date,
              order: i,
            }))
          : textOptions.map((opt, i) => ({
              optionType: "TEXT",
              label: opt.label,
              order: i,
            }));

      const response = await fetch("/api/polls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: eventTitle,
          description: description || undefined,
          type: optionType === "DATE" ? "EVENT" : "GENERIC",
          options,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to create event");
      }

      setCreatedPoll(data.data.poll);
      setShowSuccessModal(true);
      // Clear draft on successful creation
      localStorage.removeItem(DRAFT_KEY);
      // Show notification
      NotificationTemplates.eventCreated(
        data.data.poll.title,
        data.data.poll.id,
      );
    } catch (error) {
      console.error("Failed to create event:", error);
      setCreateError(
        error instanceof Error ? error.message : "Failed to create event",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const votingUrl = createdPoll
    ? `${window.location.origin}/vote/${createdPoll.id}`
    : "";

  const resultsUrl = createdPoll
    ? `${window.location.origin}/results/${createdPoll.id}`
    : "";

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-b from-ocean-50 to-ocean-100">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-down">
          <h1
            className="text-4xl md:text-5xl font-black mb-2 bg-gradient-to-r from-ocean-600 via-coral-500 to-ocean-500 bg-clip-text text-transparent animate-gradient-x bg-[length:200%_100%]"
            style={{
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Create Event
          </h1>
          <p className="text-lg text-ocean-700 font-semibold animate-slide-up">
            Plan your next hangout with friends
          </p>
        </div>

        {/* Event Details */}
        <Card className="mb-6 animate-fade-in">
          <h2 className="text-xl font-bold text-ocean-700 mb-4">
            <IconList size={24} className="inline mr-2" /> Event Details
          </h2>

          <div className="space-y-4">
            <div>
              <Input
                ref={titleInputRef}
                label="Event Title"
                placeholder="e.g., Weekend Dinner, Movie Night, Game Session"
                value={eventTitle}
                onChange={(e) => {
                  setEventTitle(e.target.value);
                  if (titleError) setTitleError(""); // Clear error on change
                }}
                error={titleError}
                fullWidth
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add any additional details..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
              />
            </div>
          </div>
        </Card>

        {/* Option Type Toggle */}
        <Card
          className="mb-6 animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          <h2 className="text-xl font-bold text-ocean-700 mb-4">Option Type</h2>
          <div className="flex gap-3">
            <Button
              variant={optionType === "DATE" ? "primary" : "outline"}
              onClick={() => setOptionType("DATE")}
              className="flex-1"
            >
              Dates
            </Button>
            <Button
              variant={optionType === "TEXT" ? "primary" : "outline"}
              onClick={() => setOptionType("TEXT")}
              className="flex-1"
            >
              Custom
            </Button>
          </div>
        </Card>

        {/* Date Selection */}
        {optionType === "DATE" && (
          <Card
            ref={optionsCardRef}
            className="mb-6 animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            <h2 className="text-xl font-bold text-ocean-700 mb-4">
              Pick Dates ({dateOptions.length} selected)
            </h2>
            {optionsError && (
              <div className="mb-4 p-3 bg-red-50 border-2 border-red-400 rounded-lg">
                <p className="text-red-700 font-medium">{optionsError}</p>
              </div>
            )}

            {/* Natural Language Date Input */}
            <div className="mb-4 p-4 bg-ocean-50 rounded-lg border border-ocean-200">
              <label className="block text-sm font-semibold text-ocean-700 mb-2">
                <IconSparkles size={18} className="inline mr-1" /> Quick Add
                (Natural Language)
              </label>
              <div className="flex gap-2">
                <Input
                  label=""
                  placeholder='Try: "tomorrow", "next week", "this weekend", "next 5 days", "12/25"'
                  value={naturalLanguageInput}
                  onChange={(e) => setNaturalLanguageInput(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && handleParseNaturalLanguage()
                  }
                  fullWidth
                />
                <Button
                  variant="primary"
                  onClick={handleParseNaturalLanguage}
                  disabled={!naturalLanguageInput.trim()}
                >
                  Parse
                </Button>
              </div>
              {parseError && (
                <p className="text-red-600 text-sm mt-2">{parseError}</p>
              )}
            </div>

            {/* Quick Patterns */}
            <div className="mb-4">
              <DatePatternPresets onDatesSelected={handlePresetSelected} />
            </div>

            <CalendarMonthView
              dateOptions={dateOptions}
              onAddDate={handleAddDate}
              onRemoveDate={handleRemoveDate}
            />

            {dateOptions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-ocean-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Selected Dates:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {dateOptions.map((opt, i) => (
                    <div
                      key={i}
                      className="px-3 py-1 bg-ocean-100 text-ocean-700 rounded-full text-sm font-medium flex items-center gap-2"
                    >
                      <span>{opt.label}</span>
                      <button
                        onClick={() => handleRemoveDate(opt.id)}
                        className="hover:text-red-600 transition-colors"
                        aria-label={`Remove ${opt.label}`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Text Options */}
        {optionType === "TEXT" && (
          <Card
            ref={optionsCardRef}
            className="mb-6 animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            <h2 className="text-xl font-bold text-ocean-700 mb-4">
              Custom Options ({textOptions.length} added)
            </h2>
            {optionsError && (
              <div className="mb-4 p-3 bg-red-50 border-2 border-red-400 rounded-lg">
                <p className="text-red-700 font-medium">{optionsError}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  label=""
                  placeholder="e.g., Italian Restaurant, Movie Theater, Park"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddTextOption()}
                  fullWidth
                />
                <Button
                  variant="primary"
                  onClick={handleAddTextOption}
                  disabled={!textInput.trim()}
                >
                  Add
                </Button>
              </div>

              {textOptions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-ocean-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Options:
                  </h3>
                  <div className="space-y-2">
                    {textOptions.map((opt) => (
                      <div
                        key={opt.id}
                        className="flex items-center justify-between px-4 py-3 bg-ocean-50 rounded-lg"
                      >
                        <span className="text-ocean-700 font-medium">
                          {opt.label}
                        </span>
                        <button
                          onClick={() => handleRemoveTextOption(opt.id)}
                          className="text-red-500 hover:text-red-700 font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Server Error */}
        {createError && (
          <Card className="mb-6 bg-red-50 border-red-200 animate-fade-in">
            <p className="text-red-700">{createError}</p>
          </Card>
        )}

        {/* Actions */}
        <div
          className="flex justify-center animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <Button
            variant="gradient"
            onClick={handleCreateEvent}
            disabled={isCreating}
            className="w-full max-w-md"
          >
            {isCreating ? (
              <>
                <IconLoader size={18} className="inline mr-1 animate-spin" />{" "}
                Creating...
              </>
            ) : (
              "Create Event"
            )}
          </Button>
        </div>

        {/* Success Modal */}
        {showSuccessModal && createdPoll && (
          <Modal
            isOpen={showSuccessModal}
            onClose={() => setShowSuccessModal(false)}
            title="Event Created!"
          >
            <div className="space-y-4">
              <p className="text-gray-700">
                Your event <strong>{createdPoll.title}</strong> has been
                created!
              </p>

              {/* Voting Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <IconChecklist size={18} className="inline mr-1" /> Voting
                  Link (Share with friends)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={votingUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                  />
                  <CopyButton
                    textToCopy={votingUrl}
                    variant="secondary"
                    size="md"
                  />
                </div>
              </div>

              {/* Results Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <IconChartBar size={18} className="inline mr-1" /> Results
                  Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={resultsUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                  />
                  <CopyButton
                    textToCopy={resultsUrl}
                    variant="secondary"
                    size="md"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSuccessModal(false);
                    navigate("/my-events");
                  }}
                  className="flex-1"
                >
                  View My Events
                </Button>
                <Button
                  variant="primary"
                  onClick={() => navigate(`/results/${createdPoll.id}`)}
                  className="flex-1"
                >
                  View Results
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
