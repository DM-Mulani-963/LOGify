import React, { useState } from 'react';

interface AIQueryProps {
  logs: any[];
  onClose?: () => void;
}

export const AIQuery: React.FC<AIQueryProps> = ({ logs, onClose }) => {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const suggestedQuestions = [
    "Are there any security threats?",
    "What are the most common errors?",
    "Is there evidence of malware?",
    "Show me failed login attempts",
    "What should I investigate first?"
  ];

  const handleAsk = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setError('');
    setResponse('');

    try {
      // Call your backend AI endpoint
      // For now, we'll use a placeholder - you'll need to implement the actual API call
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          logs: logs.slice(0, 50) // Send recent 50 logs for context
        })
      });

      if (!res.ok) {
        throw new Error('AI query failed');
      }

      const data = await res.json();
      setResponse(data.response);
      setExpanded(true);
    } catch (err: any) {
      setError(err.message || 'Failed to get AI response. Make sure AI is configured.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (q: string) => {
    setQuestion(q);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 backdrop-blur-sm rounded-lg border border-purple-500/30 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <h3 className="text-lg font-semibold text-purple-300">AI Assistant</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl"
          >
            ×
          </button>
        )}
      </div>

      {/* Input Area */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask AI about your logs..."
          className="flex-1 bg-gray-800/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
          disabled={loading}
        />
        <button
          onClick={handleAsk}
          disabled={loading || !question.trim()}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-block animate-spin">⟳</span>
              Thinking...
            </>
          ) : (
            <>
              <span>→</span>
              Ask
            </>
          )}
        </button>
      </div>

      {/* Suggested Questions */}
      {!expanded && (
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-sm text-gray-400">Try:</span>
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSuggestionClick(q)}
              className="text-xs bg-purple-900/30 hover:bg-purple-900/50 text-purple-300 px-3 py-1 rounded-full transition-colors"
              disabled={loading}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mb-3">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-xs text-gray-400 mt-1">
            Configure AI: <code className="bg-gray-800 px-2 py-0.5 rounded">logify set-ai-api gemini YOUR_KEY</code>
          </p>
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="bg-gray-800/50 border border-purple-500/30 rounded-lg p-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-lg">✨</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-purple-300 font-medium mb-2">AI Response:</p>
              <div className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">
                {response}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Footer */}
      {!response && !error && (
        <p className="text-xs text-gray-500 mt-2">
          💡 AI will analyze your recent logs to answer questions about security, errors, and patterns
        </p>
      )}
    </div>
  );
};

export default AIQuery;
