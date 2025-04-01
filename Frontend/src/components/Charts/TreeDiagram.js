import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const TreeDiagram = ({ data, query }) => {
  const d3Container = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Tree Diagram');

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Try to load data from localStorage
      const storedData = localStorage.getItem('TreeDiagram.json');
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
          
          // Format for tree diagram if needed
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
            setError('No tree diagram data available. Please process data first.');
          }
        } else {
          setError('No tree diagram data available. Please process data first.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error processing data for tree diagram:', err);
      setError(`Processing error: ${err.message}`);
      setLoading(false);
    }
  }, [data, query]);

  // D3 rendering effect
  useEffect(() => {
    if (!loading && !error && chartData && d3Container.current) {
      // Clear previous visualization
      d3.select(d3Container.current).selectAll('*').remove();

      // Convert flat data to hierarchical structure
      // For a simple visualization, we'll create a tree with a root node and direct children
      const treeData = {
        name: "Root",
        children: chartData.map(item => ({
          name: item.name,
          value: item.value
        }))
      };

      // Set up dimensions
      const width = 800;
      const height = 600;
      const margin = { top: 40, right: 90, bottom: 50, left: 90 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;
      
      // Create SVG
      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      
      // Create tree layout
      const tree = d3.tree()
        .size([innerWidth, innerHeight]);
      
      // Create root node hierarchy
      const root = d3.hierarchy(treeData);
      
      // Assign positions to nodes
      const treeRoot = tree(root);
      
      // Add links (edges)
      svg.selectAll('.link')
        .data(treeRoot.links())
        .join('path')
        .attr('class', 'link')
        .attr('d', d3.linkVertical()
          .x(d => d.x)
          .y(d => d.y)
        )
        .attr('fill', 'none')
        .attr('stroke', '#ccc')
        .attr('stroke-width', 2);
      
      // Add nodes
      const nodes = svg.selectAll('.node')
        .data(treeRoot.descendants())
        .join('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x},${d.y})`)
        .style('cursor', 'pointer');
      
      // Add node circles
      nodes.append('circle')
        .attr('r', d => d.depth === 0 ? 15 : 10)
        .attr('fill', d => d.depth === 0 ? '#4682B4' : '#69b3a2')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);
      
      // Add node labels
      nodes.append('text')
        .attr('dy', d => d.depth === 0 ? 25 : -15)
        .attr('text-anchor', 'middle')
        .text(d => d.data.name)
        .style('font-size', '12px')
        .style('fill', '#333');
      
      // Add value labels for child nodes
      nodes.filter(d => d.depth > 0)
        .append('text')
        .attr('dy', 25)
        .attr('text-anchor', 'middle')
        .text(d => d.data.value)
        .style('font-size', '10px')
        .style('fill', '#666');
      
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
      
      // Add hover interactions
      nodes
        .on('mouseover', function(event, d) {
          d3.select(this).select('circle')
            .attr('r', d => d.depth === 0 ? 18 : 12)
            .attr('stroke', '#333');
          
          const tooltipContent = d.depth === 0 
            ? `<strong>${d.data.name}</strong><br>Root Node` 
            : `<strong>${d.data.name}</strong><br>Value: ${d.data.value}`;
          
          tooltip
            .style('opacity', 1)
            .html(tooltipContent)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 15) + 'px');
        })
        .on('mousemove', function(event) {
          tooltip
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 15) + 'px');
        })
        .on('mouseleave', function(event, d) {
          d3.select(this).select('circle')
            .attr('r', d => d.depth === 0 ? 15 : 10)
            .attr('stroke', '#fff');
          
          tooltip.style('opacity', 0);
        });
    }
  }, [chartData, loading, error]);

  if (loading) {
    return <div className="chart-loading">Processing data for tree diagram...</div>;
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

export default TreeDiagram;