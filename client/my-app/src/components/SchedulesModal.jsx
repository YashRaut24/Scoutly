import React, { useState } from 'react';
import { X, Calendar, Plus, Trash2, Mail, Clock } from 'lucide-react';
import './SchedulesModal.css';

export default function SchedulesModal({ isOpen, onClose }) {
  const [topic, setTopic] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [email, setEmail] = useState('');
  const [schedules, setSchedules] = useState([]);

  if (!isOpen) return null;

  const handleCreateSchedule = (e) => {
    e.preventDefault();
    if (!topic || !email) return;

    const newSchedule = {
      id: Date.now(),
      topic,
      frequency,
      email,
      createdAt: new Date().toLocaleDateString(),
    };

    setSchedules([newSchedule, ...schedules]);
    setTopic('');
  };

  const handleDelete = (id) => {
    setSchedules((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="schedule-drawer-overlay" onClick={onClose}>
      <div className="schedule-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="header-title">
            <Calendar size={18} className="header-icon" />
            <h3>Automated Research Digests</h3>
          </div>
          <button className="close-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleCreateSchedule} className="schedule-form">
          <div className="form-group">
            <label>Research Topic / Query</label>
            <input
              type="text"
              className="styled-input"
              placeholder="e.g. Weekly AI research papers"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label>Frequency</label>
              <select
                className="styled-select"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                <option value="daily">Daily at 9:00 AM</option>
                <option value="weekly">Every Monday at 9:00 AM</option>
                <option value="monthly">1st of Month</option>
              </select>
            </div>

            <div className="form-group flex-1">
              <label>Target Email</label>
              <input
                type="email"
                className="styled-input"
                placeholder="yash@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="submit-schedule-btn">
            <Plus size={16} /> Create Scheduled Digest
          </button>
        </form>

        <div className="active-schedules-section">
          <h4>Active Schedules ({schedules.length})</h4>
          {schedules.length === 0 ? (
            <p className="empty-state">No automated digests created yet.</p>
          ) : (
            <div className="schedule-list">
              {schedules.map((item) => (
                <div key={item.id} className="schedule-card">
                  <div className="card-info">
                    <strong>{item.topic}</strong>
                    <div className="card-meta">
                      <span><Clock size={12} /> {item.frequency}</span>
                      <span><Mail size={12} /> {item.email}</span>
                    </div>
                  </div>
                  <button className="delete-card-btn" onClick={() => handleDelete(item.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}