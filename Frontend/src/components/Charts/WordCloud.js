// src/components/Charts/WordCloud.js - Custom Implementation
import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3'; // You'll need: npm install d3
import '../../styles/App.css';

const WordCloud = ({ data, query }) => {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const svgRef = useRef(null);

  // Data parsing logic - kept the same as it works well
  useEffect(() => {
    const parseData = () => {
      try {
        setLoading(true);
        setError('');
        
        // Deep extraction of text content from any data type
        const extractTextContent = (input) => {
          if (!input) return '';
          
          // Direct string
          if (typeof input === 'string') return input;
          
          // If it's an object with a response property (common pattern in API responses)
          if (typeof input === 'object') {
            // Log the object for debugging
            console.log("WordCloud received object:", JSON.stringify(input).substring(0, 200));
            
            // Try the response property first (most common case)
            if (input.response && typeof input.response === 'string') {
              return input.response;
            }
            
            // Try text property
            if (input.text && typeof input.text === 'string') {
              return input.text;
            }
            
            // Try content property
            if (input.content && typeof input.content === 'string') {
              return input.content;
            }
            
            // If object has a toString method that's been overridden
            const stringValue = input.toString();
            if (stringValue !== '[object Object]') {
              return stringValue;
            }
            
            // Extract all string values from object
            return Object.values(input)
              .filter(val => typeof val === 'string')
              .join(' ') || JSON.stringify(input);
          }
          
          // Default fallback
          return String(input);
        };
        
        // Extract text from any type of data structure
        const textContent = extractTextContent(data);
        
        console.log("Extracted text content:", textContent.substring(0, 100) + "...");
        
        // Remove markdown formatting symbols
        const cleanedText = textContent
          .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers but keep content
          .replace(/\*(.*?)\*/g, '$1')     // Remove italic markers but keep content
          .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // Remove links but keep text
          .replace(/```.*?```/gs, '');     // Remove code blocks
        
        // Remove common punctuation and convert to lowercase
        const cleanText = cleanedText
          .toLowerCase()
          .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
          .replace(/\s{2,}/g, ' ');
        
        // Split into words
        const wordArray = cleanText.split(' ');
        
        // Define common stop words to filter out
        const stopWords = new Set([
          'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with',
          'by', 'about', 'as', 'if', 'of', 'from', 'is', 'was', 'were', 'are', 'be',
          'been', 'being', 'that', 'this', 'these', 'those', 'it', 'its', 'they',
          'them', 'their', 'we', 'our', 'you', 'your', 'i', 'my', 'me', 'he', 'him',
          'his', 'she', 'her', 'object', 'objects', 'function', 'string', 'number',
          'null', 'undefined', 'prototype', 'array'
        ]);
        
        // Count word frequencies, excluding stop words and words less than 3 chars
        const wordCounts = {};
        wordArray.forEach(word => {
          if (word.length > 2 && !stopWords.has(word)) {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
          }
        });
        
        // Convert to array of objects with size based on frequency
        const wordObjects = Object.keys(wordCounts).map(word => ({
          text: word,
          value: wordCounts[word]
        }));
        
        // Sort by frequency and take top 50
        const topWords = wordObjects
          .sort((a, b) => b.value - a.value)
          .slice(0, 50);
        
        console.log(`Found ${topWords.length} words for cloud`);
        
        if (topWords.length > 0) {
          setWords(topWords);
        } else {
          setError('Could not extract meaningful words from the response.');
        }
      } catch (err) {
        console.error('Error parsing data for word cloud:', err);
        setError('Failed to process data for visualization');
      } finally {
        setLoading(false);
      }
    };
    
    if (data) {
      parseData();
    } else {
      setError('No data provided for visualization');
      setLoading(false);
    }
  }, [data]);

  // Improved visualization rendering using D3 for layout
  useEffect(() => {
    if (!words.length || !svgRef.current) return;

    // Clear previous SVG content
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = parseInt(svg.style("width"), 10) || 600;
    const height = parseInt(svg.style("height"), 10) || 400;

    // Create a color scale
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Calculate font sizes based on frequencies
    const maxValue = d3.max(words, d => d.value);
    const minValue = d3.min(words, d => d.value);
    const fontScale = d3.scaleLinear()
      .domain([minValue, maxValue])
      .range([16, 60]);

    // Create a spiral layout for word placement
    const positions = [];
    const maxRadius = Math.min(width, height) / 2;
    const angleIncrement = 0.1;
    const radiusIncrement = 0.5;
    
    // Setup the cloud layout
    let angle = 0;
    let radius = 5;
    angle += angleIncrement;
    radius += radiusIncrement;

    // Check if radius exceeds the maximum boundary
    if (radius > maxRadius) {
      radius = maxRadius * 0.8; 
    }

    const centerX = width / 2;
    const centerY = height / 2;
    
    // Place the words along a spiral
    words.forEach((word, i) => {
      // Calculate position along spiral
      let placed = false;
      let attempts = 0;
      let wordX, wordY;
      const wordSize = fontScale(word.value);
      
      while (!placed && attempts < 1000) {
        wordX = centerX + radius * Math.cos(angle);
        wordY = centerY + radius * Math.sin(angle);
        
        // Check if this position collides with any previous words
        let collision = false;
        for (let j = 0; j < positions.length; j++) {
          const pos = positions[j];
          const dx = wordX - pos.x;
          const dy = wordY - pos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Use font size to determine collision boundary
          const minDistance = (wordSize + pos.size) / 2;
          
          if (distance < minDistance) {
            collision = true;
            break;
          }
        }
        
        if (!collision) {
          placed = true;
          positions.push({
            x: wordX, 
            y: wordY,
            size: wordSize
          });
        } else {
          // Move along the spiral
          angle += angleIncrement;
          radius += radiusIncrement;
          attempts++;
        }
      }
      
      if (!placed) {
        // Fallback if couldn't place without collision
        wordX = centerX + (Math.random() - 0.5) * width * 0.8;
        wordY = centerY + (Math.random() - 0.5) * height * 0.8;
        positions.push({
          x: wordX, 
          y: wordY,
          size: wordSize
        });
      }
      
      // Add the word to the SVG
      svg.append('text')
        .attr('x', wordX)
        .attr('y', wordY)
        .attr('font-size', `${wordSize}px`)
        .attr('fill', colorScale(i % 10))
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', 'Arial, sans-serif')
        .attr('font-weight', 'bold')
        .style('cursor', 'pointer')
        .text(word.text)
        .on('mouseover', function() {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('font-size', `${wordSize * 1.1}px`)
            .attr('fill', d3.color(colorScale(i % 10)).brighter(0.5));
        })
        .on('mouseout', function() {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('font-size', `${wordSize}px`)
            .attr('fill', colorScale(i % 10));
        })
        .append('title')
        .text(`${word.text} (${word.value})`);
    });

  }, [words]);

  if (loading) {
    return <div className="chart-loading">Loading word cloud data...</div>;
  }

  if (error) {
    return (
      <div className="chart-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">Word Cloud Visualization</h3>
      <div className="word-cloud-wrapper" style={{ width: '100%', height: '400px' }}>
        {words.length > 0 ? (
          <svg 
            ref={svgRef}
            width="100%" 
            height="100%" 
            viewBox="0 0 600 400" 
            preserveAspectRatio="xMidYMid meet"
          ></svg>
        ) : (
          <div className="chart-error">No meaningful words to display</div>
        )}
      </div>
    </div>
  );
};

export default WordCloud;