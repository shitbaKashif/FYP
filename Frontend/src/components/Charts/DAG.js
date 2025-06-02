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

      // Process the data
      let graphData;
      if (typeof data === 'string') {
        // Try to parse JSON string
        try {
          graphData = JSON.parse(data);
        } catch (e) {
          // If not JSON, create a simple graph from text
          const words = data.split(/\s+/).filter(word => word.length > 2);
          graphData = {
            nodes: words.map((word, i) => ({
              id: i,
              name: word,
              value: 1
            })),
            links: words.slice(0, -1).map((word, i) => ({
              source: i,
              target: i + 1,
              value: 1
            }))
          };
        }
      } else if (Array.isArray(data)) {
        // If array, create a simple graph
        graphData = {
          nodes: data.map((item, i) => ({
            id: i,
            name: typeof item === 'object' ? (item.name || 'Unnamed') : String(item),
            value: typeof item === 'object' ? (item.value || 1) : 1
          })),
          links: data.slice(0, -1).map((_, i) => ({
            source: i,
            target: i + 1,
            value: 1
          }))
        };
      } else if (typeof data === 'object') {
        // If object, use it directly or create graph
        if (data.nodes && data.links) {
          graphData = data;
        } else if (data.children) {
          // Convert hierarchy to graph
          const nodes = [];
          const links = [];
          let id = 0;

          function processNode(node, parentId = null) {
            const nodeId = id++;
            nodes.push({
              id: nodeId,
              name: node.name || 'Unnamed',
              value: node.value || 1
            });

            if (parentId !== null) {
              links.push({
                source: parentId,
                target: nodeId,
                value: 1
              });
            }

            if (node.children) {
              node.children.forEach(child => processNode(child, nodeId));
            }
          }

          processNode(data);
          graphData = { nodes, links };
        } else {
          // Create graph from object properties
          const nodes = [];
          const links = [];
          let id = 0;

          Object.entries(data).forEach(([key, value]) => {
            const nodeId = id++;
            nodes.push({
              id: nodeId,
              name: key,
              value: typeof value === 'number' ? value : 1
            });

            if (typeof value === 'object' && value !== null) {
              Object.entries(value).forEach(([subKey, subValue]) => {
                const targetId = id++;
                nodes.push({
                  id: targetId,
                  name: subKey,
                  value: typeof subValue === 'number' ? subValue : 1
                });
                links.push({
                  source: nodeId,
                  target: targetId,
                  value: 1
                });
              });
            }
          });

          graphData = { nodes, links };
        }
      }

      // Set title
      setChartTitle(graphData.name || 'Directed Acyclic Graph');
      setChartData(graphData);
    } catch (err) {
      console.error('Error processing DAG data:', err);
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

    // Create simulation
    const simulation = d3.forceSimulation(chartData.nodes)
      .force("link", d3.forceLink(chartData.links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(50));

    // Create color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Create links
    const link = svg.append("g")
      .selectAll("line")
      .data(chartData.links)
      .join("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", d => Math.sqrt(d.value));

    // Create nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(chartData.nodes)
      .join("g")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Add circles to nodes
    node.append("circle")
      .attr("r", d => Math.sqrt(d.value) * 5 + 5)
      .attr("fill", d => color(d.id))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer");

    // Add labels to nodes
    node.append("text")
      .attr("dy", ".35em")
      .attr("text-anchor", "middle")
      .text(d => d.name)
      .style("font-size", "10px")
      .style("pointer-events", "none");

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
          <strong>${d.name}</strong><br/>
          Value: ${d.value.toLocaleString()}
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', function() {
      tooltip.style('opacity', 0);
    });

    // Update positions on each tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
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

  }, [chartData, chartTitle]);

  if (loading) {
    return <div className="chart-loading">Processing data for DAG visualization...</div>;
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

export default DAG;