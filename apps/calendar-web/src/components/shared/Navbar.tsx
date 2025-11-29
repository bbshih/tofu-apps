import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from './Button';
import { IconCalendar, IconPlus } from '@tabler/icons-react';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="bg-ocean-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-black text-white">SeaCalendar</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-3">
            {/* My Events Link */}
            <Link to="/my-events">
              <Button
                variant="glass"
                size="sm"
              >
                <IconCalendar size={18} className="inline mr-1" /> My Events
              </Button>
            </Link>

            {/* Create Event Link */}
            <Link to="/create">
              <Button
                variant="secondary"
                size="sm"
              >
                <IconPlus size={18} className="inline mr-1" /> Create Event
              </Button>
            </Link>

            {/* User Info (only when authenticated) */}
            {isAuthenticated && (
              <div className="flex items-center space-x-3 border-l-2 border-white/50 pl-4 ml-2">
                <div className="flex items-center space-x-2">
                  {user?.avatar && (
                    <img
                      src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`}
                      alt={user.username}
                      className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                    />
                  )}
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-white">
                      {user?.username}
                      {user?.discriminator && user.discriminator !== '0' && (
                        <span className="text-ocean-200">#{user.discriminator}</span>
                      )}
                    </p>
                    {user?.email && (
                      <p className="text-xs text-ocean-200">{user.email}</p>
                    )}
                  </div>
                </div>

                {/* Logout Button */}
                <Button
                  variant="glass"
                  size="sm"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
