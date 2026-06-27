"use client";

import { useState } from "react";

interface CompanySearchProps {
  onSearch: (company: string) => void;
  isLoading: boolean;
  searchCount: number;
  freeLimit: number;
}

export default function CompanySearch({
  onSearch,
  isLoading,
  searchCount,
  freeLimit,
}: CompanySearchProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed && !isLoading) {
      onSearch(trimmed);
    }
  };

  const remaining = Math.max(0, freeLimit - searchCount);

  return (
    <div className="search-container">
      <form className="search-form" onSubmit={handleSubmit}>
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            id="company-search-input"
            type="text"
            className="search-input"
            placeholder="Enter a company name (e.g., Tesla, Apple, NVIDIA)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            autoComplete="off"
            autoFocus
          />
        </div>
        <button
          id="research-submit-btn"
          type="submit"
          className="search-button"
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? (
            <>
              <span className="spinner" /> Researching...
            </>
          ) : (
            "Analyze"
          )}
        </button>
      </form>
      <p className="search-hint">
        {remaining > 0 ? (
          <>
            <span className="search-counter">{remaining}</span> free{" "}
            {remaining === 1 ? "search" : "searches"} remaining
          </>
        ) : (
          <>Using your API keys</>
        )}
      </p>
    </div>
  );
}
