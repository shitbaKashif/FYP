import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const SunBurst = ({ data, query }) => {
  const d3Container = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Sunburst Visualization');

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Try to load data from localStorage
      const storedData = localStorage.getItem('SunBurst.json');
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
          
          // Format for sunburst if needed
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
            setError('No sunburst data available. Please process data first.');
          }
        } else {
          setError('No sunburst data available. Please process data first.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error processing data for sunburst chart:', err);
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
      const radius = Math.min(width, height) / 2;
      
      // Create hierarchical data for the sunburst
      // For simple data, we'll create a hierarchy with a root and direct children
      const hierarchyData = {
        name: "root",
        children: chartData.map(item => ({
          name: item.name,
          value: item.value,
          // If your data has a path structure (like "A/B/C"), you could parse it here
          // and create a more complex hierarchy
        }))
      };
      
      // Create SVG
      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);
        
      // Create hierarchy
      const root = d3.hierarchy(hierarchyData)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);
        
      // Create partition layout
      const partition = d3.partition()
        .size([2 * Math.PI, radius]);
        
      partition(root);
      
      // Color scale
      const color = d3.scaleOrdinal(d3.schemeCategory10);
      
      // Create arc generator
      const arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1);
      
      // Draw arcs
      const path = svg.selectAll('path')
        .data(root.descendants().filter(d => d.depth)) // Skip the root node
        .join('path')
        .attr('d', arc)
        .attr('fill', d => color(d.data.name))
        .attr('opacity', 0.8)
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer');
      
      // Add text labels (only for segments that are large enough)
      svg.selectAll('text')
        .data(root.descendants().filter(d => d.depth && (d.x1 - d.x0 > 0.2)))
        .join('text')
        .attr('transform', function(d) {
          const x = (d.x0 + d.x1) / 2;
          // We calculate y but don't need to use it directly since arc.centroid() handles positioning
          // but we'll keep it for clarity on how the rotation is calculated
          const rotation = x < Math.PI ? (x * 180 / Math.PI - 90) : (x * 180 / Math.PI - 270);
          return `translate(${arc.centroid(d)}) rotate(${rotation})`;
        })
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .text(d => d.data.name.length > 10 ? d.data.name.substring(0, 10) + '...' : d.data.name)
        .style('font-size', '10px')
        .style('fill', 'white')
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
      path
        .on("mouseover", function(event, d) {
          d3.select(this)
            .attr("opacity", 1)
            .attr("stroke", "#333")
            .attr("stroke-width", 2);
            
          tooltip
            .style("opacity", 1)
            .html(`<strong>${d.data.name}</strong><br>Value: ${d.value}<br>Percentage: ${((d.value / root.value) * 100).toFixed(1)}%`);
        })
        .on("mousemove", function(event) {
          tooltip
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseleave", function(event, d) {
          d3.select(this)
            .attr("opacity", 0.8)
            .attr("stroke", "white")
            .attr("stroke-width", 1);
            
          tooltip.style("opacity", 0);
        });
      
      // Add a center label for the title
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(chartTitle.length > 20 ? chartTitle.substring(0, 20) + '...' : chartTitle);
    }
  }, [chartData, loading, error, chartTitle]);

  if (loading) {
    return <div className="chart-loading">Processing data for sunburst visualization...</div>;
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

export default SunBurst;