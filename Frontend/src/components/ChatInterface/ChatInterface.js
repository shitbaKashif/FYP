// src/components/ChatInterface/ChatInterface.js
import React, { useState, useEffect, useRef } from 'react';
import { submitQuery, getVisualizations } from '../../services/api';
import { saveChatHistory } from '../../services/firebase';
import ChatMessage from './ChatMessage';
import Button from '../Common/Button';
import '../../styles/App.css';

const ChatInterface = ({ onQuerySubmit, selectedSubreddit, selectedTopics, userId, chatHistory }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Load chat history
  useEffect(() => {
    if (chatHistory && chatHistory.length > 0) {
      setMessages(chatHistory);
    }
  }, [chatHistory]);

  // Scroll to bottom of chat
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    if (!selectedSubreddit || selectedTopics.length === 0) {
      // This will be handled by the parent component
      return;
    }
    
    const userMessage = {
      id: Date.now(),
      text: input,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      // Submit query to backend
      const response = await submitQuery(input, selectedSubreddit, selectedTopics, userId);
      console.log("Res", response)
      // Create bot message with the response
      const botMessage = {
        id: Date.now() + 1,
        text: response,
        sender: 'bot',
        timestamp: new Date().toISOString()
      };
      
      setMessages((prev) => [...prev, botMessage]);
      
      // Try to get visualization recommendations, but don't show error if it fails
      try {
        const visualizations = await getVisualizations(input, response.response || response);
        console.log("Viz",visualizations)
        
        // Notify parent component only if visualizations are successfully retrieved
        onQuerySubmit(input, response, visualizations);
      } catch (vizError) {
        // Still notify parent but with empty visualizations
        console.error('Error getting visualizations:', vizError);
        onQuerySubmit(input, response, []);
      }
      console.log(userMessage,botMessage)
      // Save chat history
      if (userId) {
        await saveChatHistory(userId, userMessage);
        await saveChatHistory(userId, botMessage);
      }
    } catch (error) {
      console.error('Error processing query:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, there was an error processing your query. Please try again.',
        sender: 'bot',
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <p>No messages yet. Start by selecting a subreddit and topics, then ask a question.</p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            !selectedSubreddit || selectedTopics.length === 0
              ? "Please select a subreddit and topics first"
              : "Type your query here..."
          }
          disabled={loading || !selectedSubreddit || selectedTopics.length === 0}
          className="chat-input"
        />
        <Button
          type="submit"
          buttonStyle="btn--primary"
          buttonSize="btn--medium"
          disabled={loading || !input.trim() || !selectedSubreddit || selectedTopics.length === 0}
        >
          {loading ? 'Processing...' : 'Send'}
        </Button>
      </form>
    </div>
  );
};

export default ChatInterface;