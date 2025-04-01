import React, { useState, useEffect } from 'react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getColorScheme } from './DataPU';
import '../../styles/App.css';

const LineChart = ({ data, query }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Line Chart Visualization');

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Check if there's data passed directly as props
      if (data) {
        // Process data using processChartData from DataPU
        import('./DataPU').then(({ processChartData }) => {
          const result = processChartData(data, query);
          
          setChartData(result.data);
          setChartTitle(result.title);
          setDataSource(result.source);
          setLoading(false);
        });
      } else {
        // Try to load data from localStorage (Line.json)
        const storedData = localStorage.getItem('Line.json');
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
      console.error('Error processing data for line chart:', err);
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

  // Sort data by index if available (for time series)
  const sortedData = [...chartData].sort((a, b) => (a.index || 0) - (b.index || 0));

  // Get appropriate color based on data source
  const colors = getColorScheme(dataSource);
  const primaryColor = colors[0];

  // Format tooltip values based on data content
  const formatTooltip = (value, name, entry) => {
    if (entry.payload.isPercentage) {
      return [`${value}%`, name];
    } else if (entry.payload.currency) {
      return [`${value} ${entry.payload.currency}`, name];
    } else {
      return [value, name];
    }
  };

  return (
    <div className="chart-container">
      <h3 className="chart-title">{chartTitle}</h3>
      {dataSource && dataSource !== 'sample' && (
        <div className="chart-source">Data source: {dataSource}</div>
      )}
      <ResponsiveContainer width="100%" height={400}>
        <RechartsLineChart
          data={sortedData}
          margin={{
            top: 20, right: 30, left: 20, bottom: 60
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
            angle={-45}
            textAnchor="end"
          />
          <YAxis />
          <Tooltip formatter={formatTooltip} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={primaryColor} 
            activeDot={{ r: 8 }} 
            name="Value" 
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChart;