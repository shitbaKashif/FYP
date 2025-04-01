// TreeMap.js
import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const TreeMap = ({ data, query }) => {
  const d3Container = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('TreeMap Visualization');

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Try to load data from localStorage
      const storedData = localStorage.getItem('TreeMap.json');
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
          
          // Format for treemap if needed
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
            setError('No treemap data available. Please process data first.');
          }
        } else {
          setError('No treemap data available. Please process data first.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error processing data for treemap:', err);
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
      const width = 800;
      const height = 500;
      
      // Handle hierarchical data
      let hierarchyData;
      
      // Check if data is already in hierarchical format with children
      if (chartData.children) {
        // Data is already in hierarchical format
        hierarchyData = chartData;
      } else if (Array.isArray(chartData)) {
        // Data is an array of items, convert to hierarchy
        hierarchyData = {
          name: "root",
          children: chartData.map(item => ({
            name: item.name || "Unnamed",
            value: item.value || 0
          }))
        };
      } else {
        // Use sample data as fallback
        hierarchyData = {
          name: "root",
          children: [
            { name: "Sample A", value: 400 },
            { name: "Sample B", value: 300 },
            { name: "Sample C", value: 200 },
            { name: "Sample D", value: 100 }
          ]
        };
      }
      
      // Create SVG
      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
        
      // Create hierarchy
      const root = d3.hierarchy(hierarchyData)
        .sum(d => d.value || 0)
        .sort((a, b) => (b.value || 0) - (a.value || 0));
        
      // Create treemap layout
      const treemap = d3.treemap()
        .size([width, height])
        .padding(2);
        
      treemap(root);
      
      // Color scale based on depth
      const color = d3.scaleOrdinal()
        .domain([0, 1, 2, 3, 4, 5]) // Different depths
        .range(d3.schemeCategory10);
      
      // Draw rectangles - include all nodes except root
      const cell = svg.selectAll('g')
        .data(root.descendants().filter(d => d.depth > 0))
        .join('g')
        .attr('transform', d => `translate(${d.x0},${d.y0})`);
      
      // Add rectangles
      cell.append('rect')
        .attr('width', d => Math.max(0, d.x1 - d.x0))
        .attr('height', d => Math.max(0, d.y1 - d.y0))
        .attr('fill', d => color(d.depth))
        .attr('opacity', d => 1 - (d.depth * 0.15)) // Deeper levels slightly more transparent
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer');
      
      // Add text labels (only for rectangles that are large enough)
      cell.append('text')
        .attr('x', 5)
        .attr('y', 15)
        .text(d => {
          const width = d.x1 - d.x0;
          const name = d.data.name || "";
          const maxChars = Math.floor(width / 7); // Rough estimate of characters that fit
          return width > 40 && name.length > 0 
            ? (name.length > maxChars ? name.substring(0, maxChars) + '...' : name)
            : '';
        })
        .attr('fill', 'white')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('pointer-events', 'none');
      
      // Add value labels for cells that are big enough
      cell.filter(d => (d.x1 - d.x0) > 60 && (d.y1 - d.y0) > 30)
        .append('text')
        .attr('x', 5)
        .attr('y', 35)
        .text(d => d.value ? `Value: ${d.value}` : '')
        .attr('fill', 'white')
        .style('font-size', '10px')
        .style('pointer-events', 'none');
      
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
      cell
        .on("mouseover", function(event, d) {
          d3.select(this).select("rect")
            .attr("stroke", "#333")
            .attr("stroke-width", 2);
            
          tooltip
            .style("opacity", 1)
            .html(`
              <strong>${d.data.name || "Unnamed"}</strong>
              <br>Value: ${d.value || 0}
              <br>Percentage: ${((d.value / root.value) * 100).toFixed(1)}%
              ${d.parent && d.parent.data.name && d.parent.data.name !== 'root' 
                ? `<br>Parent: ${d.parent.data.name}` 
                : ''
              }
            `);
        })
        .on("mousemove", function(event) {
          tooltip
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseleave", function(event, d) {
          d3.select(this).select("rect")
            .attr("stroke", "white")
            .attr("stroke-width", 1);
            
          tooltip.style("opacity", 0);
        });
    }
  }, [chartData, loading, error]);

  if (loading) {
    return <div className="chart-loading">Processing data for treemap visualization...</div>;
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

export default TreeMap;