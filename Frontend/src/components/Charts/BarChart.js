import React, { useState, useEffect } from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getColorScheme } from './DataPU';
import '../../styles/App.css';

const BarChart = ({ data, query }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Bar Chart Visualization');

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
        // Try to load data from localStorage (Bar.json)
        const storedData = localStorage.getItem('Bar.json');
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
      console.error('Error processing data for bar chart:', err);
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
        <RechartsBarChart
          data={chartData}
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
          <Bar dataKey="value" fill={primaryColor} name="Value" />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChart;