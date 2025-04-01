// src/pages/SettingsPage.js
import React, { useState } from 'react';
import Navbar from '../components/Common/Navbar';
import Footer from '../components/Common/Footer';
import Button from '../components/Common/Button';
import { useAuth } from '../context/AuthContext';
import { updateUserPassword } from '../services/firebase';
import '../styles/App.css';

const SettingsPage = () => {
  const { currentUser, userData } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      await updateUserPassword(email);
      setSuccess('Password reset email sent. Please check your inbox.');
    } catch (error) {
      setError('Failed to send password reset email. Please try again.');
      console.error('Password reset error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <Navbar />
      
      <div className="settings-container">
        <h1 className="settings-title">Account Settings</h1>
        
        <div className="settings-section account-info">
          <h2>Account Information</h2>
          
          <div className="account-details">
            <p>
              <strong>Username:</strong> {userData?.username}
            </p>
            <p>
              <strong>Email:</strong> {userData?.email}
            </p>
            <p>
              <strong>Account Type:</strong>{' '}
              {userData?.isPremium ? (
                <span className="premium-badge">Premium</span>
              ) : (
                'Basic'
              )}
            </p>
            {!userData?.isPremium && (
              <p>
                <strong>Daily Queries Used:</strong> {userData?.dailyQueries || 0}/20
              </p>
            )}
          </div>
        </div>
        
        <div className="settings-section password-section">
          <h2>Change Password</h2>
          
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          
          <form onSubmit={handleResetPassword} className="password-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
              <p className="form-help">
                We'll send a password reset link to this email.
              </p>
            </div>
            
            <Button
              type="submit"
              buttonStyle="btn--primary"
              buttonSize="btn--medium"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
        </div>
        
        <div className="settings-section data-section">
          <h2>Data Management</h2>
          
          <div className="data-options">
            <div className="data-option">
              <h3>Clear Chat History</h3>
              <p>
                Remove all your previous chat conversations with DataTails.
                This action cannot be undone.
              </p>
              <Button
                buttonStyle="btn--outline"
                buttonSize="btn--medium"
              >
                Clear History
              </Button>
            </div>
            
            <div className="data-option">
              <h3>Download Your Data</h3>
              <p>
                Export all your chat history and settings as a JSON file.
              </p>
              <Button
                buttonStyle="btn--outline"
                buttonSize="btn--medium"
              >
                Download Data
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default SettingsPage;