import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Get API base URL from environment or default to current domain + :5000
const getAPIBase = () => {
  // If environment variable is set, use it
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Development: use localhost:5000
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  
  // Production: try to use same domain with /api proxy
  return '/api';
};

const API_BASE = getAPIBase();

// Debug log for troubleshooting
console.log('API Base URL:', API_BASE);
console.log('Environment:', process.env.NODE_ENV);

// Bypass localtunnel/ngrok/serveo browser warning screens for API calls
axios.defaults.headers.common['Bypass-Tunnel-Reminder'] = 'true';
axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';
axios.defaults.headers.common['serveo-skip-browser-warning'] = 'true';


export default function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [dockerfile, setDockerfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const logsEndRef = useRef(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Poll for job status
  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/status/${jobId}`);
        setStatus(res.data.status);
        setLogs(res.data.logs);

        if (['success', 'failed'].includes(res.data.status)) {
          clearInterval(interval);
          // Fetch final result (works for both success and failure)
          try {
            const resultRes = await axios.get(`${API_BASE}/api/result/${jobId}`);
            setDockerfile(resultRes.data.dockerfile);
            if (resultRes.data.error) {
              setError(resultRes.data.error);
            }
          } catch (resultErr) {
            console.error('Failed to fetch result:', resultErr);
          }
          setLoading(false);
        }
      } catch (err) {
        if (err.response?.status !== 202) {
          setError(err.message);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [jobId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLogs([]);
    setDockerfile(null);
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/api/generate`, {
        repoUrl: repoUrl.trim(),
        maxRetries: 3,
      });

      setJobId(res.data.jobId);
      setStatus('pending');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLoading(false);
    }
  };

  const downloadDockerfile = () => {
    if (!dockerfile) return;
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(dockerfile));
    element.setAttribute('download', 'Dockerfile');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const copyToClipboard = () => {
    if (!dockerfile) return;
    navigator.clipboard.writeText(dockerfile);
    alert('Dockerfile copied to clipboard!');
  };

  return (
    <div className="container">
      <header className="header">
        <h1>🐳 DockerForge</h1>
        <p>AI-Powered Dockerfile Generator</p>
      </header>

      <div className="form-section">
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="repo-url">GitHub Repository URL</label>
            <input
              id="repo-url"
              type="text"
              placeholder="e.g., https://github.com/username/repository"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              disabled={loading}
              required
            />
            <small style={{color: '#666', marginTop: '5px', display: 'block'}}>
              Must include both username and repository name (e.g., https://github.com/expressjs/express)
            </small>
          </div>
          <button type="submit" disabled={loading || !repoUrl.trim()}>
            {loading ? 'Generating...' : 'Generate Dockerfile'}
          </button>
        </form>
      </div>

      {error && <div className="error-message">{error}</div>}

      {status && (
        <div className="status-section">
          <div className="status-badge" data-status={status}>
            {status.toUpperCase()}
          </div>
          <p>Job ID: <code>{jobId}</code></p>
        </div>
      )}

      {logs.length > 0 && (
        <div className="logs-section">
          <h2>Build Logs</h2>
          <div className="logs-container">
            {logs.map((log, idx) => (
              <pre key={idx} className="log-line">
                {log}
              </pre>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {dockerfile && (
        <div className="result-section">
          <h2>Generated Dockerfile</h2>
          <div className="dockerfile-actions">
            <button onClick={copyToClipboard} className="btn-secondary">
              📋 Copy
            </button>
            <button onClick={downloadDockerfile} className="btn-secondary">
              💾 Download
            </button>
          </div>
          <pre className="dockerfile-display">{dockerfile}</pre>
        </div>
      )}
    </div>
  );
}
