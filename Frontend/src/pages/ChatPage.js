// src/pages/ChatPage.js
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Common/Navbar';
import Footer from '../components/Common/Footer';
import ChatInterface from '../components/ChatInterface/ChatInterface';
import FilterButton from '../components/ChatInterface/FilterButton';
import CronJobButton from '../components/ChatInterface/ChronJobButton';
import VisualizationPanel from '../components/ChatInterface/VisualizationPanel';
import PopupMessage from '../components/Common/PopupMessage';
import { useAuth } from '../context/AuthContext';
import { getChatHistory, updateQueryCount } from '../services/firebase';
import { getSubredditsAndTopics } from '../services/api';
import '../styles/App.css';

const ChatPage = () => {
  const { currentUser, userData } = useAuth();
  const [selectedSubreddit, setSelectedSubreddit] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [subredditData, setSubredditData] = useState({});
  const [chatHistory, setChatHistory] = useState([]);
  const [showVisualization, setShowVisualization] = useState(false);
  const [visualizationData, setVisualizationData] = useState(null);
  const [visualizationOptions, setVisualizationOptions] = useState([]);
  const [selectedChart, setSelectedChart] = useState('');
  const [showPopup, setShowPopup] = useState(true);
  const [popupMessage, setPopupMessage] = useState({
    title: 'Welcome to DataTails Chat',
    message: 'Please select a subreddit and topics using the filter button before querying.'
  });

  // Load subreddit and topic data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Try to fetch from API first
        const data = await getSubredditsAndTopics();
        setSubredditData(data);
      } catch (error) {
        console.error('Error loading subreddits and topics from API:', error);
        
        // Fallback to local JSON file
        try {
          const response = await fetch('/subreddit_topics.json');
          const data = await response.json();
          setSubredditData(data);
        } catch (jsonError) {
          console.error('Error loading subreddit_topics.json:', jsonError);
        }
      }
    };

    loadData();
  }, []);

  // Load chat history
  useEffect(() => {
    const loadChatHistory = async () => {
      if (currentUser) {
        try {
          const history = await getChatHistory(currentUser.uid);
          setChatHistory(history);
        } catch (error) {
          console.error('Error loading chat history:', error);
        }
      }
    };

    loadChatHistory();
  }, [currentUser]);

  const handleFilterSelect = (subreddit, topics) => {
    setSelectedSubreddit(subreddit);
    setSelectedTopics(topics);
    setShowPopup(true);
    setPopupMessage({
      title: 'Filter Selected',
      message: `Selected ${subreddit} with ${topics.length} topics. You can now query DataTails.`
    });
  };

  const handleVisualizationSelect = (chart) => {
    // Check if user is premium or if the chart is a simple visualization
    const simpleVisualizations = ['bar_chart', 'line_chart', 'area_chart', 'word_cloud'];
    
    if (userData?.isPremium || simpleVisualizations.includes(chart)) {
      setSelectedChart(chart);
    } else {
      setShowPopup(true);
      setPopupMessage({
        title: 'Premium Feature',
        message: 'This is a premium visualization. Please upgrade to access advanced charts.'
      });
    }
  };

  const handleQuerySubmit = async (query, response, visualizations) => {
    if (!selectedSubreddit || selectedTopics.length === 0) {
      setShowPopup(true);
      setPopupMessage({
        title: 'Filter Required',
        message: 'Please select a subreddit and at least one topic before querying.'
      });
      return;
    }

    // Check if user has reached query limit
    if (!userData?.isPremium && userData?.dailyQueries >= 20) {
      setShowPopup(true);
      setPopupMessage({
        title: 'Query Limit Reached',
        message: 'You have reached your daily limit of 20 queries. Upgrade to premium for unlimited queries.'
      });
      return;
    }

    // Update query count
    if (currentUser) {
      try {
        await updateQueryCount(currentUser.uid);
      } catch (error) {
        console.error('Error updating query count:', error);
      }
    }

    // Show visualization panel
    setShowVisualization(true);
    setVisualizationOptions(visualizations);
    setVisualizationData({ query, response });
  };

  const closePopup = () => {
    setShowPopup(false);
  };

  return (
    <div className="chat-page">
      <Navbar />
      
      <div className="chat-container">
        <div className="chat-header">
          <h1>DataTails Chat</h1>
          <div className="chat-controls">
            <FilterButton
              onSelect={handleFilterSelect}
              subredditData={subredditData}
            />
            
            {userData?.isPremium && (
              <CronJobButton
                selectedSubreddit={selectedSubreddit}
                selectedTopics={selectedTopics}
                userId={currentUser?.uid}
              />
            )}
          </div>
        </div>
        
        <div className={`chat-content ${showVisualization ? 'with-visualization' : ''}`}>
          <div className="chat-interface-container">
            <ChatInterface
              onQuerySubmit={handleQuerySubmit}
              selectedSubreddit={selectedSubreddit}
              selectedTopics={selectedTopics}
              userId={currentUser?.uid}
              chatHistory={chatHistory}
            />
          </div>
          
          {showVisualization && (
            <div className="visualization-container">
              <VisualizationPanel
                visualizationData={visualizationData}
                visualizationOptions={visualizationOptions}
                selectedChart={selectedChart}
                onChartSelect={handleVisualizationSelect}
                isPremium={userData?.isPremium}
              />
            </div>
          )}
        </div>
      </div>
      
      {showPopup && (
        <PopupMessage
          title={popupMessage.title}
          message={popupMessage.message}
          onClose={closePopup}
        />
      )}
      
      <Footer />
    </div>
  );
};

export default ChatPage;