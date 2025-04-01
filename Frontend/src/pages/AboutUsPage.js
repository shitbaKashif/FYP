// src/pages/AboutUsPage.js
import React from 'react';
import Navbar from '../components/Common/Navbar';
import Footer from '../components/Common/Footer';
import FlipCard from '../components/Common/FlipCard';
import shitbaImg from '../assets/S.jpg';
import fasihImg from '../assets/F.jpg';
import maryamImg from '../assets/M.jpg';
import '../styles/App.css';

const AboutUsPage = () => {
  const teamMembers = [
    {
      name: 'Shitba',
      id: 'i212676',
      program: 'DS(N)',
      image: shitbaImg,
      role: 'Backend Developer',
      description: 'Specialized in knowledge graph development and data retrieval algorithms.'
    },
    {
      name: 'Fasih',
      id: 'i211705',
      program: 'DS(N)',
      image: fasihImg,
      role: 'Full Stack Developer',
      description: 'Focused on integration between frontend and backend systems.'
    },
    {
      name: 'Maryam',
      id: 'i212656',
      program: 'DS(U)',
      image: maryamImg,
      role: 'Frontend Developer',
      description: 'Specialized in UI/UX design and frontend implementation.'
    }
  ];

  return (
    <div className="about-page">
      <Navbar />
      
      <div className="about-container">
        <div className="about-header">
          <h1>About DataTails</h1>
          <p className="about-tagline">
            Bridging Data to Insights with Semantic Intelligence
          </p>
        </div>
        
        <div className="about-section">
          <div className="about-content">
            <h2>Our Mission</h2>
            <p>
              Transform chaotic Reddit data into crystal-clear insights with DataTails, 
              your ultimate AI-powered analytics platform.
            </p>
            
            <h2>What Sets DataTails Apart?</h2>
            <ul className="feature-list">
              <li>
                <strong>Smart Recommendations:</strong> Get the best charts automatically, 
                saving time and reducing guesswork.
              </li>
              <li>
                <strong>Real-Time Analytics:</strong> Stay ahead with up-to-date insights and trends.
              </li>
              <li>
                <strong>Advanced AI Engine:</strong> Powered by NLP, Knowledge Graphs, and LLMs 
                for precision and speed.
              </li>
              <li>
                <strong>Intelligent Querying:</strong> Ask complex questions and get instant, 
                actionable answers.
              </li>
              <li>
                <strong>Premium Customization:</strong> Cron jobs, advanced visualization options, 
                and enhanced features for power users.
              </li>
            </ul>
            
            <p className="mission-statement">
              With DataTails, make smarter decisions, faster.
            </p>
          </div>
        </div>
        
        <div className="team-section">
          <h2>Our Team</h2>
          <div className="team-members">
            {teamMembers.map((member, index) => (
              <FlipCard
                key={index}
                frontContent={
                  <div className="member-front">
                    <div className="member-image-container">
                      <img src={member.image} alt={member.name} className="member-image" />
                    </div>
                    <h3>{member.name}</h3>
                    <p>{member.role}</p>
                  </div>
                }
                backContent={
                  <div className="member-back">
                    <h3>{member.name}</h3>
                    <p>{member.id} {member.program}</p>
                    <p>{member.description}</p>
                  </div>
                }
              />
            ))}
          </div>
        </div>
        
        <div className="supervisor-section">
          <h2>Supervisor</h2>
          <div className="supervisor-info">
            <h3>Dr. Arshad Islam</h3>
            <p>Email: arshad.islam@nu.edu.pk</p>
            <p>
              Project mentor and guide, providing expertise in data science and 
              knowledge engineering.
            </p>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default AboutUsPage;