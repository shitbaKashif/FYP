import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const CirclePacking = ({ data, query }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartTitle, setChartTitle] = useState('');
  const d3Container = useRef(null);

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Process the data
      let hierarchyData;
      if (typeof data === 'string') {
        // Try to parse JSON string
        try {
          hierarchyData = JSON.parse(data);
        } catch (e) {
          // If not JSON, create a simple hierarchy from text
          const words = data.split(/\s+/).filter(word => word.length > 2);
          hierarchyData = {
            name: 'Text Analysis',
            children: words.map(word => ({
              name: word,
              value: 1
            }))
          };
        }
      } else if (Array.isArray(data)) {
        // If array, create a simple hierarchy
        hierarchyData = {
          name: 'Data Analysis',
          children: data.map(item => ({
            name: typeof item === 'object' ? (item.name || 'Unnamed') : String(item),
            value: typeof item === 'object' ? (item.value || 1) : 1
          }))
        };
      } else if (typeof data === 'object') {
        // If object, use it directly or create hierarchy
        if (data.children) {
          hierarchyData = data;
        } else {
          hierarchyData = {
            name: data.name || 'Data Analysis',
            children: Object.entries(data)
              .filter(([key]) => key !== 'name' && key !== 'children')
              .map(([key, value]) => ({
                name: key,
                value: typeof value === 'number' ? value : 1
              }))
          };
        }
      }

      // Set title
      setChartTitle(hierarchyData.name || 'Circle Packing Visualization');
      setChartData(hierarchyData);
    } catch (err) {
      console.error('Error processing circle packing data:', err);
      setError('Failed to process data for visualization');
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    if (!chartData || !d3Container.current) return;

    // Clear previous SVG content
    d3.select(d3Container.current).selectAll("*").remove();

    // Set dimensions and margins
    const margin = { top: 40, right: 10, bottom: 10, left: 10 };
    const width = d3Container.current.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(d3Container.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -margin.top / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text(chartTitle);

    // Create hierarchy
    const root = d3.hierarchy(chartData)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create circle packing layout
    const pack = d3.pack()
      .size([width, height])
      .padding(3);

    pack(root);

    // Create color scale
    const color = d3.scaleOrdinal()
      .domain(root.children ? root.children.map(d => d.data.name) : [])
      .range(d3.schemeCategory10);

    // Create nodes
    const node = svg.selectAll('g')
      .data(root.descendants())
      .join('g')
      .attr('transform', d => `translate(${d.x},${d.y})`);

    // Add circles
    node.append('circle')
      .attr('r', d => d.r)
      .attr('fill', d => d.children ? '#fff' : color(d.data.name))
      .attr('fill-opacity', d => d.children ? 0.3 : 0.7)
      .attr('stroke', d => d.children ? '#bbb' : null)
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('stroke', '#333')
          .attr('stroke-width', 2);
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('stroke', d.children ? '#bbb' : null)
          .attr('stroke-width', 1);
      });

    // Add labels to leaf nodes that are large enough
    const text = node
      .filter(d => !d.children && d.r > 10)
      .append('text')
      .attr('clip-path', d => `circle(${d.r})`);

    // Add name labels (truncate and add tooltip)
    text.selectAll()
      .data(d => {
        const words = d.data.name.split(/(?=[A-Z][a-z])|\s+/g);
        return words.length > 3 ? words.slice(0, 3) : words;
      })
      .join('tspan')
      .attr('x', 0)
      .attr('y', (d, i, nodes) => `${i - nodes.length / 2 + 0.35}em`)
      .text(d => d.length > 12 ? d.substring(0, 12) + '...' : d)
      .append('title')
      .text(d => d);

    // Add value labels
    text.append('tspan')
      .attr('x', 0)
      .attr('y', d => {
        const nameWords = d.data.name.split(/(?=[A-Z][a-z])|\s+/g);
        const wordCount = Math.min(nameWords.length, 3);
        return `${wordCount / 2 + 0.35}em`;
      })
      .attr('fill-opacity', 0.7)
      .text(d => d.value.toLocaleString());

    // Add tooltips
    const tooltip = d3.select(d3Container.current)
      .append('div')
      .style('opacity', 0)
      .attr('class', 'tooltip')
      .style('background-color', 'white')
      .style('border', 'solid')
      .style('border-width', '1px')
      .style('border-radius', '5px')
      .style('padding', '10px')
      .style('position', 'absolute');

    node.on('mouseover', function(event, d) {
      tooltip
        .style('opacity', 1)
        .html(`
          <strong>${d.data.name}</strong><br/>
          Value: ${d.value.toLocaleString()}<br/>
          Percentage: ${((d.value / root.value) * 100).toFixed(1)}%
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', function() {
      tooltip.style('opacity', 0);
    });

  }, [chartData, chartTitle]);

  if (loading) {
    return <div className="chart-loading">Processing data for circle packing visualization...</div>;
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
      <div ref={d3Container} style={{ width: '100%', height: '400px' }}></div>
    </div>
  );
};

export default CirclePacking;