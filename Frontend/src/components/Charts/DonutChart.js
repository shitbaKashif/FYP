import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getColorScheme } from './DataPU';
import '../../styles/App.css';

const DonutChart = ({ data, query }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Donut Chart Visualization');

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
        // Try to load data from localStorage (Donut.json)
        const storedData = localStorage.getItem('Donut.json');
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
      console.error('Error processing data for donut chart:', err);
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

  // Get appropriate colors based on data source
  const colors = getColorScheme(dataSource);

  // Format label values based on data content
  const formatTooltip = (value, name, entry) => {
    if (entry.payload.isPercentage) {
      return [`${value}% (${entry.payload.percentage}% of total)`, name];
    } else if (entry.payload.currency) {
      return [`${value} ${entry.payload.currency}`, name];
    } else {
      return [`${value} (${entry.payload.percentage}% of total)`, name];
    }
  };

  // Custom label to show percentages
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  return (
    <div className="chart-container">
      <h3 className="chart-title">{chartTitle}</h3>
      {dataSource && dataSource !== 'sample' && (
        <div className="chart-source">Data source: {dataSource}</div>
      )}
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={150}
            innerRadius={60}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={formatTooltip} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DonutChart;