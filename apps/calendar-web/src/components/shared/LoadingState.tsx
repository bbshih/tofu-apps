import Card from './Card';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Reusable loading state component with primary-themed spinner
 * Used across multiple pages to show loading state
 */
export default function LoadingState({
  message = 'Loading...',
  size = 'md'
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center bg-gradient-to-b from-primary-50 to-primary-100">
        <Card>
          <div className="text-center py-8">
            <div
              className={`animate-spin rounded-full border-b-2 border-primary-500 mx-auto mb-4 ${sizeClasses[size]}`}
            ></div>
            <p className="text-primary-700">{message}</p>
          </div>
        </Card>
      </div>
  );
}
