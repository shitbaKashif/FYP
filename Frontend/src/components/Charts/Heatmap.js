import React, { useState, useEffect } from 'react';
import '../../styles/App.css';

const HeatmapChart = ({ data, query }) => {
  const [chartData, setChartData] = useState({ items: [], min: 0, max: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Heatmap Visualization');

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Check if there's data passed directly as props
      if (data) {
        // Process data using processChartData from DataPU
        import('./DataPU').then(({ processChartData }) => {
          const result = processChartData(data, query);
          
          // Format for heatmap
          const values = result.data.map(item => item.value || 0);
          const min = Math.min(...values);
          const max = Math.max(...values);
          
          const heatmapData = {
            items: result.data.map((item, index) => ({
              name: item.name || `Item ${index + 1}`,
              value: item.value || 0,
              intensity: (item.value - min) / (max - min || 1),
              ...(item.isPercentage && { isPercentage: true }),
              ...(item.currency && { currency: item.currency })
            })),
            min,
            max
          };
          
          setChartData(heatmapData);
          setChartTitle(result.title);
          setDataSource(result.source);
          setLoading(false);
        });
      } else {
        // Try to load data from localStorage (Heatmap.json)
        const storedData = localStorage.getItem('Heatmap.json');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          setChartData(parsedData.data);
          setChartTitle(parsedData.title);
          setDataSource(parsedData.source);
          setLoading(false);
        } else {
          // Check status to see if data processing failed
          const statusData = localStorage.getItem('chartData_status');
          if (statusData) {
            const status = JSON.parse(statusData);
            if (!status.isValid) {
              setError(status.message || 'Invalid response - charts cannot be generated');
              setLoading(false);
            } else {
              setError('No chart data available. Please process data first.');
              setLoading(false);
            }
          } else {
            setError('No chart data available. Please process data first.');
            setLoading(false);
          }
        }
      }
    } catch (err) {
      console.error('Error processing data for heatmap chart:', err);
      setError(`Processing error: ${err.message}`);
      setLoading(false);
    }
  }, [data, query]);

  if (loading) {
    return <div className="chart-loading">Processing data for visualization...</div>;
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

  // Get color based on intensity (blue gradient)
  const getHeatmapColor = (intensity) => {
    // Blue gradient: light blue to dark blue
    const blue = Math.floor(255 * (1 - intensity));
    return `rgb(0, ${blue}, 255)`;
  };

  // Format value for display
  const formatValue = (item) => {
    if (item.isPercentage) {
      return `${item.value}%`;
    } else if (item.currency) {
      return `${item.value} ${item.currency}`;
    } else {
      return item.value;
    }
  };

  return (
    <div className="chart-container">
      <h3 className="chart-title">{chartTitle}</h3>
      {dataSource && dataSource !== 'sample' && (
        <div className="chart-source">Data source: {dataSource}</div>
      )}
      
      <div className="heatmap-container">
        <div className="heatmap-scale">
          <div className="heatmap-scale-label">Low</div>
          <div className="heatmap-scale-gradient"></div>
          <div className="heatmap-scale-label">High</div>
        </div>
        
        <div className="heatmap-grid">
          {chartData.items && chartData.items.map((item, index) => (
            <div 
              key={index}
              className="heatmap-cell"
              style={{ 
                backgroundColor: getHeatmapColor(item.intensity),
                opacity: 0.7 + (item.intensity * 0.3)
              }}
            >
              <div className="heatmap-label">{item.name}</div>
              <div className="heatmap-value">{formatValue(item)}</div>
            </div>
          ))}
        </div>
        
        <div className="heatmap-legend">
          <div>Min: {chartData.min}</div>
          <div>Max: {chartData.max}</div>
        </div>
      </div>
    </div>
  );
};

export default HeatmapChart;