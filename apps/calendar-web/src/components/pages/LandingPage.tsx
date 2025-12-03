import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../shared/Button';
import Card from '../shared/Card';

export default function LandingPage() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-primary-50 to-primary-100">
      <div className="text-center max-w-4xl mx-auto">
        {/* Main title with gradient and animations */}
        <div className="mb-8 animate-slide-down">
          <h1 className="text-6xl md:text-8xl">Calendar</h1>
        </div>

        {/* Discord chat conversation */}
        <div className="max-w-2xl mx-auto mb-8 bg-[#36393f] rounded-lg p-4 text-left shadow-lg">
          {/* You message */}
          <div className="flex gap-3 mb-4 animate-slide-up">
            <div className="w-10 h-10 rounded-full bg-primary-500 flex-shrink-0 flex items-center justify-center text-white font-bold">
              Y
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-white font-semibold">You</span>
                <span className="text-xs text-gray-400">12:34 PM</span>
              </div>
              <p className="text-gray-100">Let's hang out!</p>
            </div>
          </div>

          {/* Friend message */}
          <div className="flex gap-3 mb-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <div className="w-10 h-10 rounded-full bg-purple-500 flex-shrink-0 flex items-center justify-center text-white font-bold">
              F
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-white font-semibold">Friend</span>
                <span className="text-xs text-gray-400">12:35 PM</span>
              </div>
              <p className="text-gray-100">Yes! When are you free?</p>
            </div>
          </div>

          {/* You message with link */}
          <div className="flex gap-3 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <div className="w-10 h-10 rounded-full bg-primary-500 flex-shrink-0 flex items-center justify-center text-white font-bold">
              Y
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-white font-semibold">You</span>
                <span className="text-xs text-gray-400">12:36 PM</span>
              </div>
              <p className="text-gray-100">
                <span className="text-blue-400 hover:underline cursor-pointer">Vote on Calendar</span>
              </p>
            </div>
          </div>
        </div>
        {/* Features cards */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <Card variant="glass" hover3d className="text-center">
            <h3 className="font-bold text-primary-700 text-lg mb-2">
              Pick Dates
            </h3>
            <p className="text-sm text-primary-600">Suggest multiple options</p>
          </Card>
          <Card variant="glass" hover3d className="text-center">
            <h3 className="font-bold text-primary-700 text-lg mb-2">Vote Easy</h3>
            <p className="text-sm text-primary-600">Everyone picks their faves</p>
          </Card>
          <Card variant="glass" hover3d className="text-center">
            <h3 className="font-bold text-primary-700 text-lg mb-2">
              Lock It In
            </h3>
            <p className="text-sm text-primary-600">See results & decide</p>
          </Card>
        </div>

        {/* CTA Button with 3D hover effect */}
        <div
          className="animate-scale-in transform transition-all duration-300"
          style={{ animationDelay: "0.3s" }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Link to="/create">
            <Button
              variant="gradient"
              size="lg"
              className={`text-xl md:text-2xl px-12 py-6 ${
                isHovered ? "animate-wiggle" : ""
              }`}
            >
              Create Your Event
            </Button>
          </Link>
        </div>

        {/* Fun tagline */}
        <p
          className="mt-8 text-primary-600 text-sm md:text-base animate-fade-in"
          style={{ animationDelay: "0.4s" }}
        >
          No pressure. Just vibes.
        </p>
      </div>
    </div>
  );
}
