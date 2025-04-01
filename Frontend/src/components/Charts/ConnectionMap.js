import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const ConnectionMap = ({ data, query }) => {
  const d3Container = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Connection Map');

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Try to load data from localStorage
      const storedData = localStorage.getItem('ConnectionMap.json');
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
          
          // Format for connection map if needed
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
            setError('No connection map data available. Please process data first.');
          }
        } else {
          setError('No connection map data available. Please process data first.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error processing data for connection map:', err);
      setError(`Processing error: ${err.message}`);
      setLoading(false);
    }
  }, [data, query]);

  // D3 rendering effect
  useEffect(() => {
    if (!loading && !error && chartData && d3Container.current) {
      // Clear previous visualization
      d3.select(d3Container.current).selectAll('*').remove();

      // For a connection map, we'll create a network diagram with nodes positioned
      // in a grid or geographic layout
      
      // Create nodes from chart data
      const nodes = chartData.map((item, index) => ({
        id: index,
        name: item.name,
        value: item.value,
        // Position nodes in a grid layout
        x: (index % 5) * 150 + 100,
        y: Math.floor(index / 5) * 150 + 100
      }));
      
      // Create links between nodes based on similarity
      const links = [];
      
      // Create links between nodes with similar values
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          // Calculate similarity based on values
          const valueDiff = Math.abs(nodes[i].value - nodes[j].value);
          const maxValue = Math.max(nodes[i].value, nodes[j].value);
          const similarity = 1 - (valueDiff / maxValue);
          
          // Only create links if nodes are somewhat similar
          if (similarity > 0.7) {
            links.push({
              source: i,
              target: j,
              value: similarity
            });
          }
        }
      }
      
      // Ensure every node has at least one connection
      nodes.forEach((node, i) => {
        if (!links.some(link => link.source === i || link.target === i)) {
          // Find closest node by value
          let closestNode = null;
          let minDiff = Infinity;
          
          for (let j = 0; j < nodes.length; j++) {
            if (i !== j) {
              const diff = Math.abs(node.value - nodes[j].value);
              if (diff < minDiff) {
                minDiff = diff;
                closestNode = j;
              }
            }
          }
          
          if (closestNode !== null) {
            links.push({
              source: i,
              target: closestNode,
              value: 0.5
            });
          }
        }
      });

      // Set up dimensions
      const width = 800;
      const height = 600;
      
      // Create SVG
      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
      
      // Create links
      const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', d => d.value)
        .attr('stroke-width', d => d.value * 3);
      
      // Create a group for each node
      const node = svg.append('g')
        .selectAll('.node')
        .data(nodes)
        .join('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x},${d.y})`)
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
        );
      
      // Add circles for nodes
      node.append('circle')
        .attr('r', d => 10 + (d.value / d3.max(nodes, n => n.value)) * 15)
        .attr('fill', d => d3.interpolateBlues((d.value / d3.max(nodes, n => n.value)) * 0.7 + 0.3))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);
      
      // Add text labels
      node.append('text')
        .attr('dy', -15)
        .attr('text-anchor', 'middle')
        .text(d => d.name)
        .style('font-size', '12px')
        .style('fill', '#333');
      
      // Add value labels
      node.append('text')
        .attr('dy', 30)
        .attr('text-anchor', 'middle')
        .text(d => d.value)
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
      
      // Initialize simulation
      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(d => 200 * (1 - d.value)))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .on('tick', ticked);
      
      // Add hover interactions
      node
        .on('mouseover', function(event, d) {
          // Highlight connected links
          link
            .attr('stroke', l => (l.source.id === d.id || l.target.id === d.id) ? '#333' : '#999')
            .attr('stroke-opacity', l => (l.source.id === d.id || l.target.id === d.id) ? 1 : l.value)
            .attr('stroke-width', l => (l.source.id === d.id || l.target.id === d.id) ? l.value * 5 : l.value * 3);
          
          // Highlight connected nodes
          node.select('circle')
            .attr('fill', n => (n.id === d.id || links.some(l => (l.source.id === d.id && l.target.id === n.id) || (l.target.id === d.id && l.source.id === n.id))) 
              ? d3.rgb(d3.interpolateBlues((n.value / d3.max(nodes, node => node.value)) * 0.7 + 0.3)).darker(0.5) 
              : d3.interpolateBlues((n.value / d3.max(nodes, node => node.value)) * 0.7 + 0.3))
            .attr('r', n => (n.id === d.id) 
              ? 15 + (n.value / d3.max(nodes, node => node.value)) * 15 
              : 10 + (n.value / d3.max(nodes, node => node.value)) * 15);
          
          tooltip
            .style('opacity', 1)
            .html(`<strong>${d.name}</strong><br>Value: ${d.value}`)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 15) + 'px');
        })
        .on('mousemove', function(event) {
          tooltip
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 15) + 'px');
        })
        .on('mouseleave', function(event, d) {
          // Reset link styles
          link
            .attr('stroke', '#999')
            .attr('stroke-opacity', d => d.value)
            .attr('stroke-width', d => d.value * 3);
          
          // Reset node styles
          node.select('circle')
            .attr('fill', d => d3.interpolateBlues((d.value / d3.max(nodes, n => n.value)) * 0.7 + 0.3))
            .attr('r', d => 10 + (d.value / d3.max(nodes, n => n.value)) * 15);
          
          tooltip.style('opacity', 0);
        });
      
      // Update positions on each simulation tick
      function ticked() {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);
        
        node
          .attr('transform', d => `translate(${d.x},${d.y})`);
      }
      
      // Drag functions
      function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }
      
      function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      }
      
      function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
    }
  }, [chartData, loading, error]);

  if (loading) {
    return <div className="chart-loading">Processing data for connection map...</div>;
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

export default ConnectionMap;