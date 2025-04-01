// src/services/api.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Configure axios with default headers
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API endpoints for chat
export const submitQuery = async (query, subreddit, topics, userId) => {
  try {
    const response = await api.post('/api/chat', {
      user_query: query,
      userID: userId,
      subreddit: subreddit,
      topics: topics
    });
    
    // Return the response - could be an object with response field or a string
    return response.data;
  } catch (error) {
    console.error('Error submitting query:', error);
    throw error;
  }
};

// API endpoints for visualizations
export const getVisualizations = async (query, response) => {
  try {
    const vizResponse = await api.post('/api/visualize', {
      user_query: query,
      response: response
    });
    return vizResponse.data;
  } catch (error) {
    console.error('Error getting visualizations:', error);
    throw error;
  }
};

// API endpoint to get subreddits and topics
export const getSubredditsAndTopics = async () => {
  try {
    const response = await api.get('/api/subreddits');
    return response.data;
  } catch (error) {
    console.error('Error getting subreddits and topics from API:', error);
    
    // Try to fetch from local JSON file
    try {
      const response = await fetch('/subreddit_topics.json');
      const data = await response.json();
      return data;
    } catch (jsonError) {
      console.error('Error loading subreddit_topics.json:', jsonError);
      throw new Error('Failed to load subreddits and topics');
    }
  }
};

// API endpoint to schedule cron job (for premium users)
export const scheduleCronJob = async (userId, subreddit, topics, schedule) => {
  try {
    const response = await api.post('/api/schedule', {
      userID: userId,
      subreddit: subreddit,
      topics: topics,
      schedule: schedule
    });
    return response.data;
  } catch (error) {
    console.error('Error scheduling cron job:', error);
    throw error;
  }
};

export default api;