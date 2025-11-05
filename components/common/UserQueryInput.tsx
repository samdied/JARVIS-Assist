import React, { useState } from 'react';

interface UserQueryInputProps {
  onQuery: (query: string) => void;
  isLoading: boolean;
  placeholder: string;
}

const UserQueryInput: React.FC<UserQueryInputProps> = ({ onQuery, isLoading, placeholder }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onQuery(query);
      setQuery('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-3">
      <textarea
        className="w-full p-3 rounded-lg bg-gray-700 text-gray-100 border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
        rows={3}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        disabled={isLoading}
      />
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isLoading}
      >
        {isLoading ? 'Processing request, Sir...' : 'Initiate Query'}
      </button>
    </form>
  );
};

export default UserQueryInput;
