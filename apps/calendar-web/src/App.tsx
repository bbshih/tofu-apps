import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/shared/Navbar";
import NotificationPrompt from "./components/shared/NotificationPrompt";
import LandingPage from "./components/pages/LandingPage";
import LoginPage from "./components/pages/LoginPage";
import AuthCallbackPage from "./components/pages/AuthCallbackPage";
import CreateEventPage from "./components/pages/CreateEventPage";
import VotingPageDb from "./components/pages/VotingPageDb";
import ResultsPageDb from "./components/pages/ResultsPageDb";
import MyEventsPage from "./components/pages/MyEventsPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route
                path="/create"
                element={
                  <ProtectedRoute>
                    <CreateEventPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vote/:pollId"
                element={
                  <ProtectedRoute>
                    <VotingPageDb />
                  </ProtectedRoute>
                }
              />
              <Route path="/results/:pollId" element={<ResultsPageDb />} />
              <Route
                path="/my-events"
                element={
                  <ProtectedRoute>
                    <MyEventsPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          <NotificationPrompt />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
