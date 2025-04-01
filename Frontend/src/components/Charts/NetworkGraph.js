import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const NetworkGraph = ({ data, query }) => {
  const d3Container = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Network Graph Visualization');

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Try to load data from localStorage
      const storedData = localStorage.getItem('NetworkGraph.json');
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
          
          // Format for network graph if needed
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
            setError('No network graph data available. Please process data first.');
          }
        } else {
          setError('No network graph data available. Please process data first.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error processing data for network graph:', err);
      setError(`Processing error: ${err.message}`);
      setLoading(false);
    }
  }, [data, query]);

  // D3 rendering effect
  useEffect(() => {
    if (!loading && !error && chartData && d3Container.current) {
      // Clear previous visualization
      d3.select(d3Container.current).selectAll('*').remove();

      // Convert the standard data format to a network graph structure
      // For a simple dataset, we'll create connections between all nodes
      const nodes = chartData.map((item, i) => ({
        id: i,
        name: item.name,
        value: item.value,
        radius: Math.sqrt(item.value) * 3 + 5 // Scale node size based on value
      }));
      
      // Create some links between nodes (this is a simplification)
      // In a real application, you would have actual relationship data
      const links = [];
      
      // Create links between nodes with closest values
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          // Create links with a threshold (e.g., link nodes with similar values)
          const valueDiff = Math.abs(nodes[i].value - nodes[j].value);
          const maxValue = Math.max(nodes[i].value, nodes[j].value);
          const similarity = 1 - (valueDiff / maxValue);
          
          // Only create links if nodes are somewhat similar
          if (similarity > 0.7) {
            links.push({
              source: i,
              target: j,
              strength: similarity
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
              strength: 0.5
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
      
      // Create force simulation
      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(d => 150 * (1 - d.strength)))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => d.radius + 5));
      
      // Color scale
      const color = d3.scaleOrdinal(d3.schemeCategory10);
      
      // Create links
      const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', d => d.strength)
        .attr('stroke-width', d => d.strength * 3);
      
      // Create nodes
      const node = svg.append('g')
        .selectAll('g')
        .data(nodes)
        .join('g')
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended));
      
      // Add circles for nodes
      node.append('circle')
        .attr('r', d => d.radius)
        .attr('fill', d => color(d.value))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);
      
      // Add text labels
      node.append('text')
        .attr('dx', d => d.radius + 5)
        .attr('dy', '.35em')
        .text(d => d.name)
        .style('font-size', '10px')
        .style('fill', '#333');
      
      // Add tooltips
      node.append('title')
        .text(d => `${d.name}: ${d.value}`);
      
      // Update positions during simulation
      simulation.on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);
        
        node
          .attr('transform', d => `translate(${d.x},${d.y})`);
      });
      
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
    return <div className="chart-loading">Processing data for network graph visualization...</div>;
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

export default NetworkGraph;