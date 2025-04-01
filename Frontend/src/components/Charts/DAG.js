import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const DAG = ({ data, query }) => {
  const d3Container = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Directed Acyclic Graph');

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Try to load data from localStorage
      const storedData = localStorage.getItem('DAG.json');
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
          
          // Format for DAG if needed
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
            setError('No DAG data available. Please process data first.');
          }
        } else {
          setError('No DAG data available. Please process data first.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error processing data for DAG:', err);
      setError(`Processing error: ${err.message}`);
      setLoading(false);
    }
  }, [data, query]);

  // D3 rendering effect
  useEffect(() => {
    if (!loading && !error && chartData && d3Container.current) {
      // Clear previous visualization
      d3.select(d3Container.current).selectAll('*').remove();

      // For a DAG visualization, we need nodes and links
      // We'll create a simple DAG structure from our data
      // In a real application, you would have actual graph relationship data
      
      // Create nodes from chart data
      const nodes = chartData.map((item, index) => ({
        id: index,
        name: item.name,
        value: item.value
      }));
      
      // Create directed links between nodes
      // We'll create a simple flow where each node points to the next one
      // with some additional cross-links for demonstration
      const links = [];
      
      // Sort nodes by value (this will help create a hierarchy)
      nodes.sort((a, b) => b.value - a.value);
      
      // Create sequential links (node 0 -> node 1 -> node 2, etc.)
      for (let i = 0; i < nodes.length - 1; i++) {
        links.push({
          source: nodes[i].id,
          target: nodes[i + 1].id,
          value: 1
        });
      }
      
      // Add some cross-links to make it more interesting (but still acyclic)
      // For n nodes, a DAG can have at most n(n-1)/2 edges
      const maxLinks = Math.min(5, Math.floor(nodes.length * (nodes.length - 1) / 2) - nodes.length + 1);
      
      for (let i = 0; i < maxLinks; i++) {
        // Choose source and target nodes that maintain the acyclic property
        // (source always has a lower index than target)
        const sourceIndex = Math.floor(Math.random() * (nodes.length - 2));
        const targetIndex = sourceIndex + 2 + Math.floor(Math.random() * (nodes.length - sourceIndex - 2));
        
        if (targetIndex < nodes.length) {
          // Check if this link already exists
          if (!links.some(link => link.source === nodes[sourceIndex].id && link.target === nodes[targetIndex].id)) {
            links.push({
              source: nodes[sourceIndex].id,
              target: nodes[targetIndex].id,
              value: 0.5
            });
          }
        }
      }

      // Set up dimensions
      const width = 800;
      const height = 600;
      const margin = { top: 40, right: 40, bottom: 40, left: 40 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;
      
      // Create SVG
      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      
      // Set up force simulation
      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links)
          .id(d => d.id)
          .distance(100)
        )
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(innerWidth / 2, innerHeight / 2))
        .force('x', d3.forceX(innerWidth / 2).strength(0.1))
        .force('y', d3.forceY(innerHeight / 2).strength(0.1));
      
      // Define arrow markers for the links
      svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#999');
      
      // Create links
      const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', d => Math.sqrt(d.value) * 2)
        .attr('marker-end', 'url(#arrowhead)');
      
      // Create a group for each node
      const node = svg.append('g')
        .selectAll('.node')
        .data(nodes)
        .join('g')
        .attr('class', 'node')
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
        );
      
      // Add circles for nodes
      node.append('circle')
        .attr('r', d => 5 + Math.sqrt(d.value) * 0.5)
        .attr('fill', d => d3.interpolateBlues(d.value / d3.max(nodes, n => n.value)))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);
      
      // Add text labels
      node.append('text')
        .attr('dx', 12)
        .attr('dy', '.35em')
        .text(d => d.name)
        .style('font-size', '10px')
        .style('pointer-events', 'none');
      
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
      node
        .on('mouseover', function(event, d) {
          // Highlight connected links
          link
            .attr('stroke', l => (l.source.id === d.id || l.target.id === d.id) ? '#333' : '#999')
            .attr('stroke-opacity', l => (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.6)
            .attr('stroke-width', l => (l.source.id === d.id || l.target.id === d.id) ? Math.sqrt(l.value) * 3 : Math.sqrt(l.value) * 2);
          
          // Highlight connected nodes
          node.select('circle')
            .attr('fill', n => (n.id === d.id || links.some(l => (l.source.id === d.id && l.target.id === n.id) || (l.target.id === d.id && l.source.id === n.id))) 
              ? d3.rgb(d3.interpolateBlues(n.value / d3.max(nodes, n => n.value))).darker(0.5) 
              : d3.interpolateBlues(n.value / d3.max(nodes, n => n.value)))
            .attr('r', n => (n.id === d.id) ? 8 + Math.sqrt(n.value) * 0.5 : 5 + Math.sqrt(n.value) * 0.5);
          
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
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', d => Math.sqrt(d.value) * 2);
          
          // Reset node styles
          node.select('circle')
            .attr('fill', d => d3.interpolateBlues(d.value / d3.max(nodes, n => n.value)))
            .attr('r', d => 5 + Math.sqrt(d.value) * 0.5);
          
          tooltip.style('opacity', 0);
        });
      
      // Update positions on each simulation tick
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
    return <div className="chart-loading">Processing data for directed acyclic graph...</div>;
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

export default DAG;