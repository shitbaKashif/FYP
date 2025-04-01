// src/components/ChatInterface/VisualizationPanel.js
import React from 'react';
import {
  AreaChart,
  BarChart,
  LineChart,
  ChordDiagram,
  Heatmap,
  WordCloud,
  StackedArea,
  DonutChart,
  CMap,
  DAG,
  NGraph,
  PolarArea,
  SmallM,
  TreeD,
  VoronoiMap
} from '../Charts';
import '../../styles/App.css';
import TreeMap from '../Charts/TreeMap';
import CirclePacking from '../Charts/CirclePacking';
import MosaicPlot from '../Charts/MosaicPlot';
import SunBurst from '../Charts/SunBurst';

const VisualizationPanel = ({
  visualizationData,
  visualizationOptions,
  selectedChart,
  onChartSelect,
  isPremium
}) => {
  const { query, response } = visualizationData || {};
  
  // Define which visualizations are premium
  const premiumVisualizations = [
    'chord_diagram',
    'circle_packing',
    'connection_map',
    'DAG',
    'heatmap_chart',
    'mosaic_plot',
    'network_graph',
    'polar_area',
    'small_multiples',
    'sunburst_chart',
    'tree_diagram',
    'treemap_chart',
    'voronoi_map'
  ];
  
  // Use simpleVisualizations to determine which charts are available to non-premium users
  const simpleVisualizations = ['area_chart', 'bar_chart', 'line_chart', 'stacked_area', 'donut_chart', 'word_cloud'];
  
  const renderVisualization = () => {
    if (!selectedChart) {
      return (
        <div className="visualization-placeholder">
          <p>Select a chart type from the list on the right to visualize the data.</p>
        </div>
      );
    }
    
    switch (selectedChart) {
      case 'area_chart':
        return <AreaChart data={response} query={query} />;
      case 'bar_chart':
        return <BarChart data={response} query={query} />;
      case 'line_chart':
        return <LineChart data={response} query={query} />;
      case 'donut_chart':
          return <DonutChart data={response} query={query} />;
      case 'stacked_area':
          return <StackedArea data={response} query={query} />;
      case 'chord_diagram':
        return <ChordDiagram data={response} query={query} />;
      case 'heatmap_chart':
        return <Heatmap data={response} query={query} />;
      case 'treemap_chart':
        return <TreeMap data={response} query={query} />;
      case 'circle_packing':
        return <CirclePacking data={response} query={query} />;
      case 'sunburst_chart':
        return <SunBurst data={response} query={query} />;
        case 'connection_map':
        return <CMap data={response} query={query} />;
      case 'DAG':
        return <DAG data={response} query={query} />;
      case 'mosaic_plot':
        return <MosaicPlot data={response} query={query} />;
      case 'network_graph':
        return <NGraph data={response} query={query} />;
      case 'polar_area':
        return <PolarArea data={response} query={query} />;
      case 'small_multiples':
        return <SmallM data={response} query={query} />;
      case 'tree_diagram':
        return <TreeD data={response} query={query} />;
      case 'voronoi_map':
        return <VoronoiMap data={response} query={query} />;
        case 'word_cloud':
        return <WordCloud data={response} query={query} />;
      default:
        return (
          <div className="visualization-placeholder">
            <p>This visualization type is not implemented yet.</p>
          </div>
        );
    }
  };

  return (
    <div className="visualization-panel">
      <div className="visualization-header">
        <h3>Recommended Visualizations</h3>
      </div>
      
      <div className="visualization-content">
        <div className="visualization-display">
          {renderVisualization()}
        </div>
        
        <div className="visualization-options">
          <h4>Chart Types</h4>
          <div className="chart-type-list">
            {visualizationOptions.map(([chart, score]) => {
              const isPremiumChart = premiumVisualizations.includes(chart);
              const isSimpleChart = simpleVisualizations.includes(chart);
              // Only allow simple charts for non-premium users
              const isDisabled = isSimpleChart && isPremiumChart && !isPremium;
              
              return (
                <div
                  key={chart}
                  className={`chart-type-option ${selectedChart === chart ? 'selected' : ''} ${
                    isDisabled ? 'disabled' : ''
                  }`}
                  onClick={() => !isDisabled && onChartSelect(chart)}
                >
                  <div className="chart-type-info">
                    <span className="chart-name">
                      {chart.replace(/_/g, ' ')}
                      {isPremiumChart && <span className="premium-icon">✨</span>}
                    </span>
                    <span className="chart-score">{score.toFixed(2)}</span>
                  </div>
                  {isDisabled && (
                    <div className="premium-overlay">
                      <span>Premium</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {!isPremium && (
            <div className="premium-note">
              <p>
                <span className="premium-icon">✨</span> Premium charts available
                with Premium subscription.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualizationPanel;