// src/components/AccessRequestForm/AccessRequestForm.js
import React, { useState, useEffect, useRef } from 'react';
import styles from './AccessRequestForm.module.css';

const AccessRequestForm = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    reason: ''
  });
  const formRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const firstInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (formRef.current && !formRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    data.append('name', formData.name);
    data.append('email', formData.email);
    data.append('message', formData.reason); // Reason maps to "message" in Worker
    data.append('website', ''); // Honeypot field

    try {
      const response = await fetch('https://formerformfarmer.lucianoaf8.workers.dev/', {
        method: 'POST',
        body: data,
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message || 'Your request was submitted successfully!');
        onClose(); // Only close after success
      } else {
        alert('Something went wrong submitting your request.');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      alert('An error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles['access-form-overlay']}>
      <div className={styles['access-form-container']} ref={formRef}>
        <div className={styles['form-header']}>
          <h2 className="font-orbitron text-xl text-[color:var(--neon-blue)] text-glow-blue">Request Access</h2>
          <button className={styles['close-button']} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles['access-request-form']}>
          <div className={styles['form-group']}>
            <label htmlFor="name">Your Name</label>
            <input
              ref={firstInputRef}
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your name"
            />
          </div>

          <div className={styles['form-group']}>
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
            />
          </div>

          <div className={styles['form-group']}>
            <label htmlFor="reason">Why do you want access?</label>
            <textarea
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows="3"
              required
              placeholder="Briefly explain why you'd like to enter the Lucaverse..."
            />
          </div>

          {/* Hidden honeypot */}
          <input type="text" name="website" style={{ display: 'none' }} tabIndex="-1" autoComplete="off" />

          <button type="submit" className={styles['submit-button']} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AccessRequestForm;
