import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const SmallMultiples = ({ data, query }) => {
  const d3Container = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Small Multiples');

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Try to load data from localStorage
      const storedData = localStorage.getItem('SmallMultiples.json');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setChartData(parsedData.data);
        setChartTitle(parsedData.title);
        setDataSource(parsedData.source);
        setLoading(false);
      } else if (data) {
        // Process data using processChartData from DataPU if directly provided
        import('./DataPU').then(({ processChartData }) => {
          const result = processChartData(data, query);
          
          // Format for small multiples if needed
          setChartData(result.data);
          setChartTitle(result.title);
          setDataSource(result.source);
          setLoading(false);
        });
      } else {
        // Check status
        const statusData = localStorage.getItem('chartData_status');
        if (statusData) {
          const status = JSON.parse(statusData);
          if (!status.isValid) {
            setError(status.message || 'Invalid response - charts cannot be generated');
          } else {
            setError('No small multiples data available. Please process data first.');
          }
        } else {
          setError('No small multiples data available. Please process data first.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error processing data for small multiples:', err);
      setError(`Processing error: ${err.message}`);
      setLoading(false);
    }
  }, [data, query]);

  // D3 rendering effect
  useEffect(() => {
    if (!loading && !error && chartData && d3Container.current) {
      // Clear previous visualization
      d3.select(d3Container.current).selectAll('*').remove();

      // For small multiples, we'll create multiple mini-visualizations of the same type
      // Group the data into categories
      // Since our data doesn't naturally have categories, we'll create them based on value ranges
      
      // Find min and max values
      const minValue = d3.min(chartData, d => d.value);
      const maxValue = d3.max(chartData, d => d.value);
      
      // Define ranges for categories
      const range = maxValue - minValue;
      const numCategories = Math.min(6, chartData.length); // Maximum 6 categories
      const rangeSize = range / numCategories;
      
      // Assign categories
      const categorizedData = chartData.map(d => {
        const categoryIndex = Math.min(numCategories - 1, Math.floor((d.value - minValue) / rangeSize));
        return {
          ...d,
          category: `Group ${categoryIndex + 1}`
        };
      });
      
      // Group by category
      const groupedData = d3.group(categorizedData, d => d.category);
      
      // Set up dimensions for each small multiple
      const width = 800;
      const height = 600;
      const margin = { top: 40, right: 20, bottom: 40, left: 50 };
      
      // Calculate grid layout
      const columns = 3;
      const rows = Math.ceil(groupedData.size / columns);
      
      const smallWidth = (width - margin.left - margin.right) / columns;
      const smallHeight = (height - margin.top - margin.bottom) / rows;
      const innerWidth = smallWidth - margin.left - margin.right;
      const innerHeight = smallHeight - margin.top - margin.bottom;
      
      // Create SVG
      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
      
      // Create groups for each small multiple
      const groups = svg.selectAll('.small-multiple')
        .data(Array.from(groupedData))
        .join('g')
        .attr('class', 'small-multiple')
        .attr('transform', (d, i) => {
          const col = i % columns;
          const row = Math.floor(i / columns);
          return `translate(${col * smallWidth + margin.left}, ${row * smallHeight + margin.top})`;
        });
      
      // Add a title to each small multiple
      groups.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', 0)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .text(d => d[0]); // Category name
      
      // Set up scales
      const x = d3.scaleBand()
        .domain(d3.range(0, 10))
        .range([0, innerWidth])
        .padding(0.1);
      
      const y = d3.scaleLinear()
        .domain([0, maxValue])
        .range([innerHeight, 0]);
      
      // Create bars for each small multiple
      groups.each(function(d) {
        const group = d3.select(this);
        const categoryData = d[1]; // The array of data items in this category
        
        // Create x-axis (simplified, no labels)
        group.append('g')
          .attr('transform', `translate(0, ${innerHeight})`)
          .call(d3.axisBottom(x).tickValues([]));
        
        // Create y-axis
        group.append('g')
          .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth));
        
        // Add bars
        group.selectAll('.bar')
          .data(categoryData)
          .join('rect')
          .attr('class', 'bar')
          .attr('x', (d, i) => x(i % 10))
          .attr('y', d => y(d.value))
          .attr('width', x.bandwidth())
          .attr('height', d => innerHeight - y(d.value))
          .attr('fill', '#69b3a2')
          .attr('stroke', '#fff')
          .attr('stroke-width', 1)
          .on('mouseover', function(event, d) {
            tooltip
              .style('opacity', 1)
              .html(`<strong>${d.name}</strong><br>Value: ${d.value}`)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 15) + 'px');
            
            d3.select(this)
              .attr('fill', '#28a745')
              .attr('stroke', '#333');
          })
          .on('mousemove', function(event) {
            tooltip
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 15) + 'px');
          })
          .on('mouseleave', function() {
            tooltip.style('opacity', 0);
            
            d3.select(this)
              .attr('fill', '#69b3a2')
              .attr('stroke', '#fff');
          });
        
        // Add labels to bars
        group.selectAll('.bar-label')
          .data(categoryData)
          .join('text')
          .attr('class', 'bar-label')
          .attr('x', (d, i) => x(i % 10) + x.bandwidth() / 2)
          .attr('y', d => y(d.value) - 5)
          .attr('text-anchor', 'middle')
          .style('font-size', '10px')
          .text(d => d.name.substring(0, 3) + '...');
      });
      
      // Add a title
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', 15)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .text(chartTitle);
      
      // Add tooltips
      const tooltip = d3.select(d3Container.current)
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('background-color', 'white')
        .style('border', 'solid')
        .style('border-width', '1px')
        .style('border-radius', '5px')
        .style('padding', '10px');
    }
  }, [chartData, loading, error, chartTitle]);

  if (loading) {
    return <div className="chart-loading">Processing data for small multiples...</div>;
  }

  if (error) {
    return (
      <div className="chart-error">
        <div className="error-message">{error}</div>
        <div className="debug-info">
          <h4>Debug data:</h4>
          <pre>{typeof data === 'object' ? JSON.stringify(data, null, 2).substring(0, 300) : 'No data'}</pre>
          <h4>Query text (sample):</h4>
          <pre>
            {typeof query === 'string' ? query.substring(0, 300) : 
             typeof query === 'object' && query.response ? query.response.substring(0, 300) : 
             'No query text'}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">{chartTitle}</h3>
      {dataSource && dataSource !== 'sample' && (
        <div className="chart-source">Data source: {dataSource}</div>
      )}
      <div className="d3-container" ref={d3Container} />
    </div>
  );
};

export default SmallMultiples;