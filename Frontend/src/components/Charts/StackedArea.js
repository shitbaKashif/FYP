import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const StackedArea = ({ data, query }) => {
  const d3Container = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Stacked Area Chart');

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Try to load data from localStorage
      const storedData = localStorage.getItem('StackedArea.json');
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
          
          // Format for stacked area chart if needed
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
            setError('No stacked area chart data available. Please process data first.');
          }
        } else {
          setError('No stacked area chart data available. Please process data first.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error processing data for stacked area chart:', err);
      setError(`Processing error: ${err.message}`);
      setLoading(false);
    }
  }, [data, query]);

  // D3 rendering effect
  useEffect(() => {
    if (!loading && !error && chartData && d3Container.current) {
      // Clear previous visualization
      d3.select(d3Container.current).selectAll('*').remove();

      // For a stacked area chart, we need to transform our regular data format
      // to time series with multiple series
      
      // Sort data by any order/index field if available, otherwise use array index
      const sortedData = [...chartData].sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        if (a.index !== undefined && b.index !== undefined) {
          return a.index - b.index;
        }
        return 0;
      });
      
      // Get unique categories for stacking (we'll use a simple approach by creating multiple series)
      // For real stacked area chart, you would have actual time series with multiple categories
      // Here we'll create a simulated version as an example
      
      // Create time points (x-values)
      const timePoints = sortedData.map(d => d.name);
      
      // Create series for stacking (simulate multiple series from single series data)
      // We'll create 3 series based on the original data
      const series = [
        {
          name: 'Series 1',
          values: sortedData.map(d => ({
            time: d.name,
            value: d.value * 0.5 // 50% of original
          }))
        },
        {
          name: 'Series 2',
          values: sortedData.map(d => ({
            time: d.name,
            value: d.value * 0.3 // 30% of original
          }))
        },
        {
          name: 'Series 3',
          values: sortedData.map(d => ({
            time: d.name,
            value: d.value * 0.2 // 20% of original
          }))
        }
      ];

      // Set up dimensions
      const width = 800;
      const height = 500;
      const margin = { top: 40, right: 100, bottom: 60, left: 60 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;
      
      // Create SVG
      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      
      // Create scales
      const x = d3.scaleBand()
        .domain(timePoints)
        .range([0, innerWidth])
        .padding(0.1);
      
      const y = d3.scaleLinear()
        .domain([0, d3.max(sortedData, d => d.value) * 1.1]) // Add 10% padding
        .range([innerHeight, 0]);
      
      // Stack generator
      const stack = d3.stack()
        .keys(series.map(s => s.name))
        .value((d, key) => {
          // Find the series with this name
          const seriesData = series.find(s => s.name === key);
          // Find the value for this time point
          if (seriesData) {
            const point = seriesData.values.find(v => v.time === d.time);
            return point ? point.value : 0;
          }
          return 0;
        });
      
      // Prepare data for stacking
      const stackData = timePoints.map(time => {
        const obj = { time };
        series.forEach(s => {
          const point = s.values.find(v => v.time === time);
          obj[s.name] = point ? point.value : 0;
        });
        return obj;
      });
      
      // Generate stacked data
      const stackedData = stack(stackData);
      
      // Color scale
      const color = d3.scaleOrdinal()
        .domain(series.map(s => s.name))
        .range(d3.schemeCategory10);
      
      // Area generator
      const area = d3.area()
        .x(d => x(d.data.time) + x.bandwidth() / 2)
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveCardinal);
      
      // Draw areas
      svg.selectAll('.area')
        .data(stackedData)
        .join('path')
        .attr('class', 'area')
        .attr('d', area)
        .attr('fill', d => color(d.key))
        .attr('opacity', 0.8)
        .style('cursor', 'pointer');
      
      // Add axes
      const xAxis = d3.axisBottom(x)
        .tickFormat(d => d.length > 15 ? d.substring(0, 15) + '...' : d);
      
      svg.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis)
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em');
      
      const yAxis = d3.axisLeft(y);
      
      svg.append('g')
        .call(yAxis);
      
      // Add axis labels
      svg.append('text')
        .attr('transform', `translate(${innerWidth / 2}, ${innerHeight + margin.bottom - 10})`)
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Time');
      
      svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -40)
        .attr('x', -innerHeight / 2)
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Value');
      
      // Add legend
      const legend = svg.append('g')
        .attr('transform', `translate(${innerWidth + 10}, 0)`);
      
      series.forEach((s, i) => {
        const legendRow = legend.append('g')
          .attr('transform', `translate(0, ${i * 20})`);
          
        legendRow.append('rect')
          .attr('width', 15)
          .attr('height', 15)
          .attr('fill', color(s.name));
          
        legendRow.append('text')
          .attr('x', 20)
          .attr('y', 12)
          .text(s.name)
          .style('font-size', '12px');
      });
      
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
      svg.selectAll('.area')
        .on('mouseover', function(event, d) {
          d3.select(this)
            .attr('opacity', 1);
            
          tooltip
            .style('opacity', 1);
        })
        .on('mousemove', function(event, d) {
          // Find mouse position in data coordinates
          const [xPos] = d3.pointer(event);
          
          // Find closest data point
          const timeIndex = Math.floor(xPos / (innerWidth / timePoints.length));
          const time = timePoints[Math.min(timeIndex, timePoints.length - 1)];
          
          if (time) {
            const seriesName = d.key;
            const seriesData = stackData.find(item => item.time === time);
            const value = seriesData ? seriesData[seriesName] : 0;
            
            tooltip
              .html(`<strong>${seriesName}</strong><br>${time}: ${value.toFixed(2)}`)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 15) + 'px');
          }
        })
        .on('mouseleave', function() {
          d3.select(this)
            .attr('opacity', 0.8);
            
          tooltip.style('opacity', 0);
        });
    }
  }, [chartData, loading, error]);

  if (loading) {
    return <div className="chart-loading">Processing data for stacked area chart...</div>;
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

export default StackedArea;