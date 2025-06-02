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
  const [containerSize, setContainerSize] = useState({ width: 600, height: 400 });

  // Responsive container size
  useEffect(() => {
    function updateSize() {
      if (d3Container.current) {
        setContainerSize({
          width: d3Container.current.clientWidth || 600,
          height: d3Container.current.clientHeight || 400
        });
      }
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    try {
      setLoading(true);
      setError('');
      let hierarchyData;
      if (typeof data === 'string') {
        try {
          hierarchyData = JSON.parse(data);
        } catch (e) {
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
        hierarchyData = {
          name: 'Data Analysis',
          children: data.map(item => ({
            name: typeof item === 'object' ? (item.name || 'Unnamed') : String(item),
            value: typeof item === 'object' ? (item.value || 1) : 1
          }))
        };
      } else if (typeof data === 'object') {
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
      setChartTitle(hierarchyData.name || 'Tree Map Visualization');
      setChartData(hierarchyData);
    } catch (err) {
      console.error('Error processing treemap data:', err);
      setError('Failed to process data for visualization');
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    if (!loading && !error && chartData && d3Container.current) {
      d3.select(d3Container.current).selectAll('*').remove();
      const width = containerSize.width;
      const height = containerSize.height;
      const margin = { top: 30, right: 10, bottom: 10, left: 10 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;
      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('font', '10px sans-serif');
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', margin.top / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .text(chartTitle);
      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      const root = d3.hierarchy(chartData)
        .sum(d => d.value || 0)
        .sort((a, b) => (b.value || 0) - (a.value || 0));
      const treemap = d3.treemap()
        .size([innerWidth, innerHeight])
        .paddingOuter(3)
        .paddingTop(19)
        .paddingInner(1)
        .round(true);
      treemap(root);
      const color = d3.scaleOrdinal()
        .domain(root.children ? root.children.map(d => d.data.name) : [])
        .range(d3.schemeCategory10);
      const leaf = g.selectAll('g')
        .data(root.leaves())
        .join('g')
        .attr('transform', d => `translate(${d.x0},${d.y0})`);
      leaf.append('clipPath')
        .attr('id', (d, i) => `clip-${i}`)
        .append('rect')
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => d.y1 - d.y0);
      leaf.append('rect')
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => d.y1 - d.y0)
        .attr('fill', d => {
          let node = d;
          while (node.depth > 1) node = node.parent;
          return color(node.data.name);
        })
        .attr('fill-opacity', 0.7)
        .attr('stroke', 'white')
        .style('cursor', 'pointer');
      // Improved label handling: truncate if too long, add tooltip
      leaf.append('title')
        .text(d => `${d.data.name}\nValue: ${d.value.toLocaleString()}\n${((d.value / root.value) * 100).toFixed(1)}%`);
      leaf.append('text')
        .attr('clip-path', (d, i) => `url(#clip-${i})`)
        .attr('x', 4)
        .attr('y', 16)
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .attr('fill', '#222')
        .text(d => d.data.name.length > 15 ? d.data.name.substring(0, 12) + '...' : d.data.name)
        .append('title')
        .text(d => d.data.name);
      leaf.append('text')
        .attr('clip-path', (d, i) => `url(#clip-${i})`)
        .attr('x', 4)
        .attr('y', 32)
        .attr('font-size', '11px')
        .attr('fill', '#444')
        .text(d => d.value.toLocaleString());
      g.selectAll('titles')
        .data(root.descendants().filter(d => d.depth === 1))
        .join('g')
        .attr('class', 'titles')
        .attr('transform', d => `translate(${d.x0},${d.y0})`)
        .append('text')
        .attr('x', 4)
        .attr('y', 15)
        .attr('font-weight', 'bold')
        .attr('font-size', '12px')
        .text(d => d.data.name)
        .attr('fill', d => color(d.data.name));
    }
  }, [chartData, loading, error, chartTitle, containerSize]);

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
    <div className="chart-container" style={{ width: '100%', height: '400px', minHeight: 300 }}>
      <h3 className="chart-title">{chartTitle}</h3>
      {dataSource && dataSource !== 'sample' && (
        <div className="chart-source">Data source: {dataSource}</div>
      )}
      <div className="d3-container" ref={d3Container} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default TreeMap;