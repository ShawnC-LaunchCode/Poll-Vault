interface AnonymousHeaderProps {
  isAnonymous: boolean;
}

export function AnonymousHeader({ isAnonymous }: AnonymousHeaderProps) {
  if (!isAnonymous) return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-2">
      <div className="flex items-center justify-center space-x-2 text-blue-700 dark:text-blue-300">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span className="text-sm font-medium">Anonymous Survey</span>
        <span className="text-xs opacity-75">Your responses are not linked to your identity</span>
      </div>
    </div>
  );
}
