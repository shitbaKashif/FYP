// src/components/Charts/WordCloud.js - Custom Implementation
import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3'; // You'll need: npm install d3
import '../../styles/App.css';

const WordCloud = ({ data, query }) => {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const svgRef = useRef(null);

  // Custom spiral layout function
  const spiralLayout = (width, height, spacing) => {
    return (index) => {
      const radius = spacing * Math.sqrt(index);
      const theta = index * 2.4;
      return [
        width / 2 + radius * Math.cos(theta),
        height / 2 + radius * Math.sin(theta)
      ];
    };
  };

  useEffect(() => {
    const parseData = () => {
      try {
        setLoading(true);
        setError('');
        
        // Handle different data formats
        let textContent = '';
        
        if (typeof data === 'string') {
          textContent = data;
        } else if (Array.isArray(data)) {
          // If it's an array of objects, extract text from name/value pairs
          textContent = data.map(item => {
            if (typeof item === 'object') {
              return `${item.name || ''} ${item.value || ''}`;
            }
            return String(item);
          }).join(' ');
        } else if (typeof data === 'object') {
          // Handle object data
          if (data.response) {
            textContent = data.response;
          } else if (data.text) {
            textContent = data.text;
          } else if (data.content) {
            textContent = data.content;
          } else {
            // Extract all string values from object
            textContent = Object.entries(data)
              .map(([key, value]) => `${key} ${value}`)
              .join(' ');
          }
        }
        
        console.log("Processing text content:", textContent.substring(0, 100) + "...");
        
        // Clean and process text
        const cleanText = textContent
          .toLowerCase()
          .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
          .replace(/\s{2,}/g, ' ')
          .trim();
        
        // Split into words and count frequencies
        const wordCounts = {};
        const words = cleanText.split(/\s+/);
        
        words.forEach(word => {
          if (word.length > 2) {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
          }
        });
        
        // Convert to array and sort by frequency
        const wordArray = Object.entries(wordCounts)
          .map(([text, value]) => ({ text, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 100); // Take top 100 words
        
        if (wordArray.length > 0) {
          setWords(wordArray);
        } else {
          setError('No meaningful words found in the data');
        }
      } catch (err) {
        console.error('Error processing word cloud data:', err);
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

    // Create spiral layout
    const spiral = spiralLayout(width, height, 5);

    // Place words in a spiral pattern
    const positions = [];
    words.forEach((word, i) => {
      const point = spiral(i);
      if (point) {
        positions.push({
          x: point[0],
          y: point[1],
          text: word.text,
          value: word.value,
          size: fontScale(word.value)
        });
      }
    });

    // Add words to SVG
    svg.selectAll("text")
      .data(positions)
      .join("text")
      .attr("x", d => d.x)
      .attr("y", d => d.y)
      .attr("font-size", d => `${d.size}px`)
      .attr("fill", (d, i) => colorScale(i % 10))
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("cursor", "pointer")
      .text(d => d.text)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("font-size", `${d.size * 1.1}px`)
          .attr("fill", d3.color(colorScale(d.value % 10)).brighter(0.5));
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("font-size", `${d.size}px`)
          .attr("fill", colorScale(d.value % 10));
      })
      .append("title")
      .text(d => `${d.text} (${d.value})`);

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