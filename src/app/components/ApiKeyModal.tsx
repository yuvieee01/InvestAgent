"use client";

import { useState } from "react";

interface ApiKeyModalProps {
  onSave: (googleKey: string, tavilyKey: string) => void;
  onCancel: () => void;
}

export default function ApiKeyModal({ onSave, onCancel }: ApiKeyModalProps) {
  const [googleKey, setGoogleKey] = useState("");
  const [tavilyKey, setTavilyKey] = useState("");

  const handleSave = () => {
    if (googleKey.trim() && tavilyKey.trim()) {
      onSave(googleKey.trim(), tavilyKey.trim());
    }
  };

  return (
    <div className="key-modal-overlay" onClick={onCancel}>
      <div className="key-modal" onClick={(e) => e.stopPropagation()}>
        <h2>🔑 API Keys Required</h2>
        <p>
          You&apos;ve used all free searches. To continue, please provide your
          own API keys. They&apos;ll be stored locally in your browser and never
          sent to our servers.
        </p>

        <div className="key-input-group">
          <label htmlFor="google-api-key">Google Gemini API Key</label>
          <input
            id="google-api-key"
            type="password"
            className="key-input"
            placeholder="AIza..."
            value={googleKey}
            onChange={(e) => setGoogleKey(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="key-input-group">
          <label htmlFor="tavily-api-key">Tavily API Key</label>
          <input
            id="tavily-api-key"
            type="password"
            className="key-input"
            placeholder="tvly-..."
            value={tavilyKey}
            onChange={(e) => setTavilyKey(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="key-modal-actions">
          <button className="key-cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="key-save-btn"
            onClick={handleSave}
            disabled={!googleKey.trim() || !tavilyKey.trim()}
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
