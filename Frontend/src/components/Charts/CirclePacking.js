import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const CirclePacking = ({ data, query }) => {
  const d3Container = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Circle Packing Visualization');

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Try to load data from localStorage
      const storedData = localStorage.getItem('CirclePacking.json');
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
          
          // Format for circle packing if needed
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
            setError('No circle packing data available. Please process data first.');
          }
        } else {
          setError('No circle packing data available. Please process data first.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error processing data for circle packing:', err);
      setError(`Processing error: ${err.message}`);
      setLoading(false);
    }
  }, [data, query]);

  // D3 rendering effect
  useEffect(() => {
    if (!loading && !error && chartData && d3Container.current) {
      // Clear previous visualization
      d3.select(d3Container.current).selectAll('*').remove();

      // Set up dimensions
      const width = 600;
      const height = 600;
      
      // Create a hierarchical structure for circle packing
      // For simple data, we'll create a hierarchy with a root and direct children
      const hierarchyData = {
        name: "root",
        children: chartData.map(item => ({
          name: item.name,
          value: item.value
        }))
      };
      
      // Create SVG
      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(0,0)`);
        
      // Create hierarchy and pack layout
      const root = d3.hierarchy(hierarchyData)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);
        
      const packLayout = d3.pack()
        .size([width, height])
        .padding(4);
        
      packLayout(root);
      
      // Color scale
      const color = d3.scaleOrdinal(d3.schemeCategory10);
      
      // Create circles for each node
      const node = svg.selectAll("g")
        .data(root.descendants())
        .join("g")
        .attr("transform", d => `translate(${d.x},${d.y})`);
      
      // The root circle is usually just a container, we'll make it transparent
      node.append("circle")
        .attr("r", d => d.r)
        .attr("fill", d => d.depth === 0 ? "white" : color(d.data.name))
        .attr("opacity", d => d.depth === 0 ? 0.0 : 0.7)
        .attr("stroke", d => d.depth === 0 ? "none" : "#ccc")
        .attr("stroke-width", 1);
      
      // Add labels for non-root nodes
      node.filter(d => d.depth > 0)
        .append("text")
        .attr("dy", ".3em")
        .style("text-anchor", "middle")
        .style("font-size", d => Math.min(2 * d.r, (2 * d.r - 8) / d.data.name.length * 10) + "px")
        .text(d => d.data.name)
        .attr("fill", "#333")
        .style("pointer-events", "none");
      
      // Add value labels
      node.filter(d => d.depth > 0 && d.r > 20)
        .append("text")
        .attr("dy", "1.5em")
        .style("text-anchor", "middle")
        .style("font-size", d => Math.min(d.r / 2, d.r / 3) + "px")
        .text(d => d.value)
        .attr("fill", "#333")
        .style("pointer-events", "none");
      
      // Add tooltips
      const tooltip = d3.select(d3Container.current)
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "1px")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("position", "absolute");
      
      // Add hover effects and tooltip functionality
      node.filter(d => d.depth > 0)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
          d3.select(this).select("circle")
            .attr("opacity", 1)
            .attr("stroke", "#333")
            .attr("stroke-width", 2);
            
          tooltip
            .style("opacity", 1)
            .html(`<strong>${d.data.name}</strong><br>Value: ${d.value}`);
        })
        .on("mousemove", function(event) {
          tooltip
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseleave", function(event, d) {
          d3.select(this).select("circle")
            .attr("opacity", 0.7)
            .attr("stroke", "#ccc")
            .attr("stroke-width", 1);
            
          tooltip.style("opacity", 0);
        });
    }
  }, [chartData, loading, error]);

  if (loading) {
    return <div className="chart-loading">Processing data for circle packing visualization...</div>;
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

export default CirclePacking;