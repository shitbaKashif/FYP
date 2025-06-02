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

      // Use hierarchical data if available, or wrap flat data in a root node
      const treeData = chartData.children ? chartData : {
        name: chartTitle || "Root",
        children: Array.isArray(chartData) ? chartData.map(item => ({
          name: item.name,
          value: item.value
        })) : [{ name: "No data", value: 0 }]
      };

      // Set up dimensions
      const width = 928;
      const height = 680;
      const marginTop = 10;
      const marginRight = 10;
      const marginBottom = 10;
      const marginLeft = 40;
      
      // Create a hierarchy from the data
      const root = d3.hierarchy(treeData);
      
      // Calculate parameters for horizontal tree layout
      const dx = 18; // Node size (height)
      const dy = (width - marginRight - marginLeft) / (1 + root.height); // Distance between levels
      
      // Create tree layout and link shape generator
      const tree = d3.tree().nodeSize([dx, dy]);
      const diagonal = d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x);
      
      // Create SVG
      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [-marginLeft, -marginTop, width, height])
        .attr('style', 'max-width: 100%; height: auto; font: 10px sans-serif; user-select: none;');
      
      // Create layers for links and nodes
      const gLink = svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5);
      
      const gNode = svg.append("g")
        .attr("cursor", "pointer")
        .attr("pointer-events", "all");
      
      // Initialize node positions for animation
      root.x0 = dy / 2;
      root.y0 = 0;
      
      // Assign IDs to nodes and prepare for collapsible tree
      root.descendants().forEach((d, i) => {
        d.id = i;
        d._children = d.children;
        // Initially collapsed deep nodes
        if (d.depth && d.depth > 1) d.children = null;
      });
      
      // Update function to handle tree rendering and transitions
      function update(event, source) {
        const duration = event?.altKey ? 2500 : 250; // hold alt to slow animation
        const nodes = root.descendants().reverse();
        const links = root.links();
        
        // Compute the new tree layout
        tree(root);
        
        // Find the left-most and right-most nodes to determine height
        let left = root;
        let right = root;
        root.eachBefore(node => {
          if (node.x < left.x) left = node;
          if (node.x > right.x) right = node;
        });
        
        const height = right.x - left.x + marginTop + marginBottom;
        
        // Transition the entire tree
        const transition = svg.transition()
          .duration(duration)
          .attr("height", height)
          .attr("viewBox", [-marginLeft, left.x - marginTop, width, height])
          .tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"));
        
        // Update nodes
        const node = gNode.selectAll("g")
          .data(nodes, d => d.id);
        
        // Enter new nodes at the parent's previous position
        const nodeEnter = node.enter().append("g")
          .attr("transform", d => `translate(${source.y0},${source.x0})`)
          .attr("fill-opacity", 0)
          .attr("stroke-opacity", 0)
          .on("click", (event, d) => {
            d.children = d.children ? null : d._children;
            update(event, d);
          });
        
        // Add circles for nodes
        nodeEnter.append("circle")
          .attr("r", 4)
          .attr("fill", d => d._children ? "#555" : "#999")
          .attr("stroke-width", 10);
        
        // Add text labels
        nodeEnter.append("text")
          .attr("dy", "0.31em")
          .attr("x", d => d._children ? -6 : 6)
          .attr("text-anchor", d => d._children ? "end" : "start")
          .text(d => d.data.name)
          .clone(true).lower()
          .attr("stroke", "white")
          .attr("stroke-width", 3);
        
        // Add value labels for leaf nodes
        nodeEnter.filter(d => !d._children && d.data.value)
          .append("text")
          .attr("dy", "1.1em")
          .attr("x", 6)
          .attr("text-anchor", "start")
          .attr("fill", "#999")
          .text(d => `(${d.data.value})`)
          .clone(true).lower()
          .attr("stroke", "white")
          .attr("stroke-width", 3);
        
        // Transition nodes to their new positions
        const nodeUpdate = node.merge(nodeEnter).transition(transition)
          .attr("transform", d => `translate(${d.y},${d.x})`)
          .attr("fill-opacity", 1)
          .attr("stroke-opacity", 1);
        
        // Transition exiting nodes to the parent's new position and remove
        const nodeExit = node.exit().transition(transition).remove()
          .attr("transform", d => `translate(${source.y},${source.x})`)
          .attr("fill-opacity", 0)
          .attr("stroke-opacity", 0);
        
        // Update links
        const link = gLink.selectAll("path")
          .data(links, d => d.target.id);
        
        // Enter new links at the parent's previous position
        const linkEnter = link.enter().append("path")
          .attr("d", d => {
            const o = {x: source.x0, y: source.y0};
            return diagonal({source: o, target: o});
          });
        
        // Transition links to their new positions
        link.merge(linkEnter).transition(transition)
          .attr("d", diagonal);
        
        // Transition exiting links to the parent's new position and remove
        link.exit().transition(transition).remove()
          .attr("d", d => {
            const o = {x: source.x, y: source.y};
            return diagonal({source: o, target: o});
          });
        
        // Store the old positions for transition
        root.eachBefore(d => {
          d.x0 = d.x;
          d.y0 = d.y;
        });
      }
      
      // Initial update to render the tree
      update(null, root);
      
      // Add title
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text(chartTitle);
    }
  }, [chartData, loading, error, chartTitle]);

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