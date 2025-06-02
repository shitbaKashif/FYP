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

      // Process the data
      let hierarchyData;
      if (typeof data === 'string') {
        // Try to parse JSON string
        try {
          hierarchyData = JSON.parse(data);
        } catch (e) {
          // If not JSON, create a simple hierarchy from text
          const words = data.split(/\s+/).filter(word => word.length > 2);
          hierarchyData = {
            name: 'Text Analysis',
            children: words.map(word => ({
              name: word,
              value: 1
            }))
          };
        }
      } else if (Array.isArray(data)) {
        // If array, create a simple hierarchy
        hierarchyData = {
          name: 'Data Analysis',
          children: data.map(item => ({
            name: typeof item === 'object' ? (item.name || 'Unnamed') : String(item),
            value: typeof item === 'object' ? (item.value || 1) : 1
          }))
        };
      } else if (typeof data === 'object') {
        // If object, use it directly or create hierarchy
        if (data.children) {
          hierarchyData = data;
        } else {
          hierarchyData = {
            name: data.name || 'Data Analysis',
            children: Object.entries(data)
              .filter(([key]) => key !== 'name' && key !== 'children')
              .map(([key, value]) => ({
                name: key,
                value: typeof value === 'number' ? value : 1
              }))
          };
        }
      }

      // Set title
      setChartTitle(hierarchyData.name || 'Sunburst Visualization');
      setChartData(hierarchyData);
    } catch (err) {
      console.error('Error processing sunburst data:', err);
      setError('Failed to process data for visualization');
    } finally {
      setLoading(false);
    }
  }, [data]);

  // D3 rendering effect
  useEffect(() => {
    if (!loading && !error && chartData && d3Container.current) {
      // Clear previous visualization
      d3.select(d3Container.current).selectAll('*').remove();

      // Set up dimensions
      const width = 600;
      const height = 600;
      const radius = width / 6;  // Match official implementation

      // Create SVG with correct viewBox
      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [-width / 2, -height / 2, width, width])
        .style('font', '10px sans-serif');

      // Create hierarchy and compute layout
      const root = d3.hierarchy(chartData)
        .sum(d => d.value || 0)
        .sort((a, b) => b.value - a.value);

      // Create partition layout
      const partition = d3.partition()
        .size([2 * Math.PI, root.height + 1]);

      partition(root);
      root.each(d => d.current = d);

      // Create color scale - match the official example
      const color = d3.scaleOrdinal(
        d3.quantize(
          d3.interpolateRainbow, 
          root.children ? root.children.length + 1 : 10
        )
      );

      // Create arc generator
      const arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
        .padRadius(radius * 1.5)
        .innerRadius(d => d.y0 * radius)
        .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1));

      // Append the arcs
      const path = svg.append("g")
        .selectAll('path')
        .data(root.descendants().slice(1))
        .join('path')
        .attr("fill", d => { 
          while (d.depth > 1) d = d.parent; 
          return color(d.data.name); 
        })
        .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
        .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none")
        .attr("d", d => arc(d.current));

      // Make them clickable if they have children
      path.filter(d => d.children)
        .style("cursor", "pointer")
        .on("click", clicked);

      // Format for tooltips
      const format = d3.format(",d");
      path.append("title")
        .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\n${format(d.value)}`);

      // Add labels - match official implementation
      const label = svg.append("g")
        .attr("pointer-events", "none")
        .attr("text-anchor", "middle")
        .style("user-select", "none")
        .selectAll("text")
        .data(root.descendants().slice(1))
        .join("text")
        .attr("dy", "0.35em")
        .attr("fill-opacity", d => +labelVisible(d.current))
        .attr("transform", d => labelTransform(d.current))
        .text(d => d.data.name.length > 14 ? d.data.name.substring(0, 12) + '...' : d.data.name)
        .append('title')
        .text(d => d.data.name);

      // Add center circle for return to parent
      const parent = svg.append("circle")
        .datum(root)
        .attr("r", radius)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on("click", clicked);

      // Handle zoom on click
      function clicked(event, p) {
        parent.datum(p.parent || root);

        root.each(d => d.target = {
          x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          y0: Math.max(0, d.y0 - p.depth),
          y1: Math.max(0, d.y1 - p.depth)
        });

        const t = svg.transition().duration(event.altKey ? 7500 : 750);

        // Transition the data on all arcs
        path.transition(t)
          .tween("data", d => {
            const i = d3.interpolate(d.current, d.target);
            return t => d.current = i(t);
          })
          .filter(function(d) {
            return +this.getAttribute("fill-opacity") || arcVisible(d.target);
          })
          .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0)
          .attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none")
          .attrTween("d", d => () => arc(d.current));

        label.filter(function(d) {
          return +this.getAttribute("fill-opacity") || labelVisible(d.target);
        }).transition(t)
          .attr("fill-opacity", d => +labelVisible(d.target))
          .attrTween("transform", d => () => labelTransform(d.current));
      }

      // Helper functions for visibility and positioning
      function arcVisible(d) {
        return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
      }

      function labelVisible(d) {
        return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
      }

      function labelTransform(d) {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        const y = (d.y0 + d.y1) / 2 * radius;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
      }

      // Add title text
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .attr("fill", "#333")
        .attr("y", -height/2 + 20)
        .text(chartTitle);
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