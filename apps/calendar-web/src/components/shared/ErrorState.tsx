import { useNavigate } from 'react-router-dom';
import { IconRefresh, IconHome } from '@tabler/icons-react';
import Button from './Button';
import Card from './Card';

interface ErrorStateProps {
  title?: string;
  error: string;
  onRetry?: () => void;
  onGoHome?: () => void;
}

/**
 * Reusable error state component with optional retry and home actions
 * Used across multiple pages to show error states
 */
export default function ErrorState({
  title = 'Oops! Something went wrong',
  error,
  onRetry,
  onGoHome
}: ErrorStateProps) {
  const navigate = useNavigate();

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      navigate('/');
    }
  };

  return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center bg-gradient-to-b from-primary-50 to-primary-100">
        <div className="max-w-md mx-auto">
          <Card>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-primary-700 mb-4">
                {title}
              </h1>
              <p className="text-red-600 mb-6">{error}</p>
              <div className="flex gap-3 justify-center">
                {onRetry && (
                  <Button onClick={onRetry} variant="secondary" size="md">
                    <IconRefresh size={18} className="inline mr-1" /> Try Again
                  </Button>
                )}
                <Button onClick={handleGoHome} variant="primary" size="md">
                  <IconHome size={18} className="inline mr-1" /> Go Home
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
  );
}
