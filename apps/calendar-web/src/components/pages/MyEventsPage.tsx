import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  IconCalendar,
  IconCheck,
  IconChecklist,
  IconChartBar,
} from "@tabler/icons-react";
import { useAuth } from "../../contexts/AuthContext";
import Card from "../shared/Card";
import Button from "../shared/Button";
import CopyButton from "../shared/CopyButton";
import { setMyEventsPageMeta } from "../../utils/metaTags";

interface Poll {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  votingDeadline?: string;
  createdAt: string;
  options: any[];
}

export default function MyEventsPageDb() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setMyEventsPageMeta();
  }, []);

  useEffect(() => {
    loadPolls();
  }, []);

  const loadPolls = async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/polls/user/created", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to load polls");
      }

      setPolls(data.data.polls);
    } catch (error) {
      console.error("Failed to load polls:", error);
      setLoadError(
        error instanceof Error ? error.message : "Failed to load polls",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VOTING":
        return (
          <span className="px-2 py-1 bg-success-100 text-success-700 rounded text-xs font-medium">
            Voting Open
          </span>
        );
      case "FINALIZED":
        return (
          <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs font-medium">
            <IconCheck size={14} className="inline mr-1" /> Finalized
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
            Cancelled
          </span>
        );
      case "EXPIRED":
        return (
          <span className="px-2 py-1 bg-accent-100 text-accent-700 rounded text-xs font-medium">
            Expired
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-light-50 to-primary-50 p-4 flex items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <p className="text-gray-600">Loading your events...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-b from-primary-50 to-primary-100">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-slide-down">
          <div>
            <h1
              className="text-4xl md:text-5xl font-black mb-2 bg-gradient-to-r from-primary-600 via-accent-500 to-primary-500 bg-clip-text text-transparent animate-gradient-x bg-[length:200%_100%]"
              style={{
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              <IconCalendar
                size={40}
                className="inline mr-2 text-primary-600"
                style={{
                  WebkitTextFillColor: "#0e7490",
                }}
              />{" "}
              My Events
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="gradient"
              size="sm"
              onClick={() => navigate("/create")}
            >
              + New Event
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        {loadError && (
          <Card className="mb-6 bg-red-50 border-red-200">
            <p className="text-red-700">{loadError}</p>
          </Card>
        )}

        {polls.length === 0 ? (
          <Card hover3d={false} className="text-center py-12 animate-fade-in">
            <h2 className="text-2xl font-bold text-primary-600 mb-2">
              No Events Yet
            </h2>
            <p className="text-primary-500 mb-4">
              Create your first event here on the web or via Discord!
            </p>
            <Button
              variant="gradient"
              size="lg"
              onClick={() => navigate("/create")}
            >
              ✨ Create Event
            </Button>
            <p className="text-sm text-gray-600 mt-6">
              💡 Tip: Use <code className="bg-gray-200 px-2 py-1 rounded">/create</code> in Discord to create an event from there
            </p>
          </Card>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {polls.map((poll, index) => {
              const votingUrl = `${window.location.origin}/vote/${poll.id}`;
              const resultsUrl = `${window.location.origin}/results/${poll.id}`;

              return (
                <Card
                  key={poll.id}
                  hover3d={false}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="space-y-4">
                    {/* Event Title and Status */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-primary-700 mb-1">
                          {poll.title}
                        </h3>
                        {poll.description && (
                          <p className="text-sm text-gray-600 mb-2">
                            {poll.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span>Created {formatDate(poll.createdAt)}</span>
                          <span>•</span>
                          <span>{poll.options.length} options</span>
                        </div>
                      </div>
                      {getStatusBadge(poll.status)}
                    </div>

                    {/* Voting Link */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <IconChecklist size={18} className="inline mr-1" />{" "}
                        Voting Link (Share with friends)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={votingUrl}
                          readOnly
                          className="flex-1 px-4 py-2 border-2 border-primary-200 rounded-lg bg-primary-50 text-sm font-mono"
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
                        <IconChartBar size={18} className="inline mr-1" />{" "}
                        Results Link
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={resultsUrl}
                          readOnly
                          className="flex-1 px-4 py-2 border-2 border-accent-200 rounded-lg bg-light-100 text-sm font-mono"
                        />
                        <Button
                          variant="primary"
                          size="md"
                          onClick={() => navigate(`/results/${poll.id}`)}
                        >
                          View Results
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => navigate("/")}>
            ← Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
