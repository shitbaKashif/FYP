/**
 * Unified data processing utility for chart components
 */

/**
 * Main function to process input data into chartable format
 * @param {any} data - The input data in any format
 * @param {any} query - Additional query information that might contain the response
 * @returns {Object} - Processed data and metadata
 */

export const processChartData = (data, query) => {
  console.log("DATA:", data);
  console.log("QUERY:", query);
  try {
    // Check if data is a saved chat format
    if (typeof data === 'string' && data.trim().startsWith('Saving chat:')) {
      return processSavedChatData(data);
    }

    // Handle markdown data
    if (typeof data === 'string' && (data.includes('**') || data.includes('#') || data.includes('- '))) {
      return processMarkdownData(data);
    }
    
    // First priority: Check for response property in data
    if (data && typeof data === 'object' && data.response) {
      return processResponseData(data);
    }
    
    // Second priority: Check for response in query
    if (query && typeof query === 'object' && query.response) {
      return processResponseData(query);
    }
    
    // Third priority: Process the data directly
    if (typeof data === 'string') {
      return processTextData(data);
    } else if (Array.isArray(data)) {
      return processArrayData(data);
    } else if (data && typeof data === 'object') {
      return processObjectData(data);
    }
    
    // Fallback to sample data
    return generateSampleData('Could not extract usable data');
  } catch (error) {
    console.error('Error processing chart data:', error);
    return generateSampleData('Error processing data: ' + error.message);
  }
};

export const processAndSaveChartData = (data, query) => {
  try {
    // Process the data
    const result = processChartData(data, query);
    
    // If processing result indicates invalid response, return early
    if (result.isInvalid) {
      localStorage.setItem('chartData_status', JSON.stringify({
        isValid: false,
        message: result.message || 'Invalid response - charts cannot be generated'
      }));
      return result;
    }
    
    // Format data for different chart types
    const barData = formatForBarChart(result.data);
    const lineData = formatForLineChart(result.data);
    const areaData = formatForAreaChart(result.data);
    const donutData = formatForDonutChart(result.data);
    const polarData = formatForPolarArea(result.data);
    const heatmapData = formatForHeatmapChart(result.data);
    const wordCloudData = formatForWordCloud(result.data);
    
    // Store in localStorage with chart-specific formats
    localStorage.setItem('Bar.json', JSON.stringify({
      data: barData,
      title: result.title,
      source: result.source
    }));
    
    localStorage.setItem('Line.json', JSON.stringify({
      data: lineData,
      title: result.title,
      source: result.source
    }));
    
    localStorage.setItem('Area.json', JSON.stringify({
      data: areaData,
      title: result.title,
      source: result.source
    }));
    
    localStorage.setItem('Donut.json', JSON.stringify({
      data: donutData,
      title: result.title,
      source: result.source
    }));

    localStorage.setItem('Polar.json', JSON.stringify({
      data: polarData,
      title: result.title,
      source: result.source
    }));
    
    localStorage.setItem('Heatmap.json', JSON.stringify({
      data: heatmapData,
      title: result.title,
      source: result.source
    }));
    
    localStorage.setItem('WordCloud.json', JSON.stringify({
      data: wordCloudData,
      title: result.title,
      source: result.source
    }));
    
    // Set status to valid
    localStorage.setItem('chartData_status', JSON.stringify({
      isValid: true,
      title: result.title,
      source: result.source
    }));
    
    return result;
  } catch (error) {
    console.error('Error saving chart data:', error);
    localStorage.setItem('chartData_status', JSON.stringify({
      isValid: false,
      message: 'Error processing data: ' + error.message
    }));
    return generateSampleData('Error processing data: ' + error.message);
  }
};

/**
 * Format data specifically for bar charts
 */
function formatForBarChart(data) {
  // Bar charts can use the data as is, just ensure it has name/value properties
  return data.map(item => ({
    name: item.name || 'Unnamed',
    value: item.value || 0,
    ...(item.isPercentage && { isPercentage: true }),
    ...(item.currency && { currency: item.currency })
  }));
}

/**
 * Format data specifically for line charts
 */
function formatForLineChart(data) {
  // Line charts often need a time dimension or sequence
  // Add an index property if not already present
  return data.map((item, index) => ({
    name: item.name || `Point ${index + 1}`,
    value: item.value || 0,
    index: item.order || index,
    ...(item.isPercentage && { isPercentage: true }),
    ...(item.currency && { currency: item.currency })
  }));
}

/**
 * Format data specifically for area charts
 */
function formatForAreaChart(data) {
  // Similar to line charts but might need additional properties
  return data.map((item, index) => ({
    name: item.name || `Point ${index + 1}`,
    value: item.value || 0,
    index: item.order || index,
    ...(item.isPercentage && { isPercentage: true }),
    ...(item.currency && { currency: item.currency })
  }));
}

/**
 * Format data specifically for donut charts
 */
function formatForDonutChart(data) {
  // Donut charts often show percentages of a whole
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
  
  return data.map(item => ({
    name: item.name || 'Unnamed',
    value: item.value || 0,
    percentage: total > 0 ? ((item.value || 0) / total * 100).toFixed(1) : 0,
    ...(item.isPercentage && { isPercentage: true }),
    ...(item.currency && { currency: item.currency })
  }));
}

function formatForPolarArea(data) {
  // Polar Area is similar to a pie/donut chart but with varying radius
  return data.map(item => ({
    name: item.name || 'Unnamed',
    value: item.value || 0,
    ...(item.isPercentage && { isPercentage: true }),
    ...(item.currency && { currency: item.currency })
  }));
}

/**
 * Format data specifically for heatmap charts
 */
function formatForHeatmapChart(data) {
  // For heatmaps, we need to determine the min and max values for color scaling
  const values = data.map(item => item.value || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  return {
    items: data.map((item, index) => ({
      name: item.name || `Item ${index + 1}`,
      value: item.value || 0,
      intensity: (item.value - min) / (max - min || 1), // Normalized intensity between 0 and 1
      ...(item.isPercentage && { isPercentage: true }),
      ...(item.currency && { currency: item.currency })
    })),
    min,
    max
  };
}

/**
 * Format data specifically for word cloud
 */
function formatForWordCloud(data) {
  // Word clouds typically use text size proportional to value
  const values = data.map(item => item.value || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  return data.map(item => ({
    text: item.name || 'Unnamed',
    value: item.value || 0,
    size: 10 + ((item.value - min) / (max - min || 1)) * 40, // Size between 10 and 50
    ...(item.isPercentage && { isPercentage: true }),
    ...(item.currency && { currency: item.currency })
  }));
}

/**
 * Process saved chat data in the format provided
 */
function processSavedChatData(chatString) {
  try {
    // Extract the JSON array from the string
    const jsonStart = chatString.indexOf('[');
    const jsonEnd = chatString.lastIndexOf(']') + 1;
    
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('Invalid chat format');
    }
    
    const chatJson = chatString.substring(jsonStart, jsonEnd);
    const chatData = JSON.parse(chatJson);
    
    // Find the bot response
    const botMessage = chatData.find(msg => msg.sender === 'bot');
    
    if (!botMessage) {
      return generateSampleData('No bot response found in chat');
    }
    
    // Check if the response is valid for chart generation
    if (typeof botMessage.text === 'object' && botMessage.text.response) {
      const responseText = botMessage.text.response;
      
      // Check if it's a rejection or non-chartable response
      if (responseText.includes('cannot provide') || 
          responseText.includes('I\'m sorry') ||
          responseText.includes('I apologize')) {
        return {
          data: [],
          title: 'Invalid Response',
          source: 'invalid',
          isInvalid: true,
          message: 'Invalid response - charts cannot be generated'
        };
      }
      
      // Process the response text
      return processTextData(responseText);
    } else if (typeof botMessage.text === 'string') {
      return processTextData(botMessage.text);
    }
    
    return generateSampleData('Could not extract usable data from chat');
  } catch (error) {
    console.error('Error processing chat data:', error);
    return generateSampleData('Error processing chat data: ' + error.message);
  }
}

/**
 * Process markdown data
 */
function processMarkdownData(markdown) {
  try {
    // Basic markdown parsing (simplified without using external library)
    // Remove bold markers
    let plainText = markdown.replace(/\*\*(.*?)\*\*/g, '$1');
    // Remove italic markers
    plainText = plainText.replace(/\*(.*?)\*/g, '$1');
    // Remove headings
    plainText = plainText.replace(/#+\s+(.*?)(?:\n|$)/g, '$1\n');
    // Replace bullet points with plain text
    plainText = plainText.replace(/^\s*[-*+]\s+/gm, '');
    
    // Process the plain text
    return processTextData(plainText);
  } catch (error) {
    console.error('Error processing markdown:', error);
    return processTextData(markdown); // Fallback to processing as regular text
  }
}
  
  /**
   * Process data with a response property
   */
  function processResponseData(data) {
    const responseText = data.response;
    
    // Check for various data formats in the response text
    if (containsCurrencyData(responseText)) {
      return extractCurrencyData(responseText);
    } else if (containsTimeData(responseText)) {
      return extractTimeData(responseText);
    } else if (containsPercentageData(responseText)) {
      return extractPercentageData(responseText);
    } else if (containsBulletPoints(responseText)) {
      return extractBulletPointData(responseText);
    } else {
      return extractGeneralTextData(responseText);
    }
  }
  
  /**
   * Process direct text input
   */
  function processTextData(text) {
    if (containsCurrencyData(text)) {
      return extractCurrencyData(text);
    } else if (containsTimeData(text)) {
      return extractTimeData(text);
    } else if (containsPercentageData(text)) {
      return extractPercentageData(text);
    } else if (containsBulletPoints(text)) {
      return extractBulletPointData(text);
    } else {
      return extractGeneralTextData(text);
    }
  }
  
  /**
   * Process array data
   */
  function processArrayData(array) {
    if (array.length === 0) {
      return generateSampleData('Empty array provided');
    }
    
    // If array already has the right format (name/value pairs)
    if (typeof array[0] === 'object' && 'name' in array[0] && 'value' in array[0]) {
      return {
        data: array,
        title: 'Array Data',
        source: 'structured array'
      };
    }
    
    // Convert array items to correct format
    const processed = array.map((item, index) => {
      if (typeof item === 'object') {
        // Find appropriate keys for name and value
        const keys = Object.keys(item);
        const nameKey = keys.find(k => 
          k.toLowerCase().includes('name') || 
          k.toLowerCase().includes('label') || 
          k.toLowerCase().includes('category') || 
          typeof item[k] === 'string'
        ) || keys[0];
        
        const valueKey = keys.find(k =>
          k.toLowerCase().includes('value') ||
          k.toLowerCase().includes('count') ||
          k.toLowerCase().includes('amount') ||
          typeof item[k] === 'number'
        ) || keys.find(k => k !== nameKey) || keys[1] || keys[0];
        
        return {
          name: String(item[nameKey] || `Item ${index}`),
          value: typeof item[valueKey] === 'number' ? 
            item[valueKey] : 
            parseFloat(item[valueKey]) || 0
        };
      } else if (typeof item === 'number') {
        return { name: `Item ${index}`, value: item };
      } else {
        return { name: String(item), value: 0 };
      }
    });
    
    return {
      data: processed,
      title: 'Array Data',
      source: 'array'
    };
  }
  
  /**
   * Process object data (key-value pairs)
   */
  function processObjectData(obj) {
    // Filter out non-data properties
    const filtered = {};
    let hasValues = false;
    
    for (const [key, value] of Object.entries(obj)) {
      if (key !== 'response' && !key.startsWith('_') && key !== 'query') {
        if (typeof value === 'number' || 
            (typeof value === 'string' && !isNaN(parseFloat(value)))) {
          filtered[key] = typeof value === 'number' ? value : parseFloat(value);
          hasValues = true;
        }
      }
    }
    
    if (hasValues) {
      const data = Object.entries(filtered).map(([key, value]) => ({
        name: key,
        value: value
      }));
      
      return {
        data,
        title: 'Object Data',
        source: 'object'
      };
    }
    
    // If no numeric values found, try processing as text
    if (obj.toString && typeof obj.toString === 'function') {
      return processTextData(obj.toString());
    }
    
    return generateSampleData('No usable data in object');
  }
  
  /**
   * Check if the text contains currency data
   */
  function containsCurrencyData(text) {
    const currencyPatterns = [
      /USD|EUR|GBP|JPY|CAD/i,
      /\$\s*\d+/,
      /\d+\s*\$/,
      /€\s*\d+/,
      /\d+\s*€/,
      /£\s*\d+/,
      /\d+\s*£/,
      /¥\s*\d+/,
      /\d+\s*¥/,
      /exchange rate/i,
      /currency/i
    ];
    
    return currencyPatterns.some(pattern => pattern.test(text));
  }
  
  /**
   * Extract currency data from text
   */
  function extractCurrencyData(text) {
    const results = [];
    let title = 'Currency Data';
    
    // Look for exchange rate patterns
    const exchangeRatePattern1 = /(\w+)\s*(\d{4}):\s*(\d+)\s*(\w{3})\s*=\s*([0-9.]+)\s*(\w{3})/g;
    const exchangeRatePattern2 = /(\d+)\s*(\w{3})\s*=\s*([0-9.]+)\s*(\w{3})/g;
    
    let match;
    
    // Extract month-based exchange rates (January 2023: 1 USD = 0.95 EUR)
    while ((match = exchangeRatePattern1.exec(text)) !== null) {
      const [, month, year, amount1, currency1, amount2, currency2] = match;
      results.push({
        name: `${month} ${currency1}-${currency2}`,
        value: parseFloat(amount2),
        month,
        year,
        fromCurrency: currency1,
        toCurrency: currency2,
        originalAmount: parseFloat(amount1)
      });
      
      // Update title if we found month-based data
      title = `${month} ${year} Exchange Rates`;
    }
    
    // Reset the regex state
    exchangeRatePattern1.lastIndex = 0;
    
    // If we didn't find month-based rates, try generic exchange rates (1 USD = 0.95 EUR)
    if (results.length === 0) {
      while ((match = exchangeRatePattern2.exec(text)) !== null) {
        const [, amount1, currency1, amount2, currency2] = match;
        results.push({
          name: `${currency1} to ${currency2}`,
          value: parseFloat(amount2),
          fromCurrency: currency1,
          toCurrency: currency2,
          originalAmount: parseFloat(amount1)
        });
        
        title = 'Currency Exchange Rates';
      }
    }
    
    // If still no results, look for currency values
    if (results.length === 0) {
      const currencyValuePattern = /([\w\s]+):\s*([€$£¥])\s*([0-9.]+)|([€$£¥])\s*([0-9.]+)\s*([\w\s]+)/g;
      
      while ((match = currencyValuePattern.exec(text)) !== null) {
        if (match[1]) { // First pattern match
          results.push({
            name: match[1].trim(),
            value: parseFloat(match[3]),
            currency: match[2]
          });
        } else { // Second pattern match
          results.push({
            name: match[6].trim(),
            value: parseFloat(match[5]),
            currency: match[4]
          });
        }
      }
    }
    
    // Special case for the format in the screenshot
    if (results.length === 0 && text.includes('USD') && 
        (text.includes('January') || text.includes('July')) && 
        (text.includes('EUR') || text.includes('CAD') || text.includes('JPY'))) {
      
      // Try to match patterns like "January 2023: 1 USD = 0.95 EUR, 1.12 CAD, 120 JPY"
      const months = ['January', 'July'];
      const currencies = ['EUR', 'CAD', 'JPY'];
      
      months.forEach(month => {
        currencies.forEach(currency => {
          const pattern = new RegExp(`${month}[^:]*?:.*?USD\\s*=\\s*([0-9.]+)\\s*${currency}`, 'i');
          const match = text.match(pattern);
          
          if (match) {
            results.push({
              name: `${month} USD-${currency}`,
              value: parseFloat(match[1]),
              month,
              currency
            });
          }
        });
      });
      
      if (results.length > 0) {
        title = 'USD Exchange Rates';
      }
    }
    
    return {
      data: results.length > 0 ? results : generateSampleData('No currency data found').data,
      title,
      source: 'currency data'
    };
  }
  
  /**
   * Check if the text contains time-based data
   */
  function containsTimeData(text) {
    const timePatterns = [
      /January|February|March|April|May|June|July|August|September|October|November|December/i,
      /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i,
      /\b20\d\d\b/,  // Years like 2023
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,  // Dates like 01/31/2023
      /\b\d{4}-\d{2}-\d{2}\b/,  // ISO dates like 2023-01-31
      /\bQ[1-4]\b/i,  // Quarters like Q1, Q2
      /\bquarter \d\b/i  // "Quarter 1"
    ];
    
    return timePatterns.some(pattern => pattern.test(text));
  }
  
  /**
   * Extract time-based data from text
   */
  function extractTimeData(text) {
    const results = [];
    let title = 'Time Series Data';
    
    // Map for month ordering
    const monthOrder = {
      'january': 1, 'jan': 1,
      'february': 2, 'feb': 2,
      'march': 3, 'mar': 3, 
      'april': 4, 'apr': 4,
      'may': 5,
      'june': 6, 'jun': 6,
      'july': 7, 'jul': 7,
      'august': 8, 'aug': 8,
      'september': 9, 'sep': 9,
      'october': 10, 'oct': 10,
      'november': 11, 'nov': 11,
      'december': 12, 'dec': 12
    };
    
    // Extract month-based data
    const monthPattern = /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[^:]*?:\s*([0-9.]+)/gi;
    
    let match;
    while ((match = monthPattern.exec(text)) !== null) {
      const month = match[1];
      const value = parseFloat(match[2]);
      
      if (!isNaN(value)) {
        // Get the standardized month name and order
        const monthLower = month.toLowerCase();
        let monthName = month;
        let order = 0;
        
        for (const [key, val] of Object.entries(monthOrder)) {
          if (monthLower.startsWith(key)) {
            order = val;
            // Convert abbreviations to full month names if needed
            if (month.length <= 3) {
              monthName = key.charAt(0).toUpperCase() + key.slice(1);
            }
            break;
          }
        }
        
        results.push({
          name: monthName,
          value,
          order  // Used for sorting
        });
      }
    }
    
    // If we found month data, sort by month order and set appropriate title
    if (results.length > 0) {
      results.sort((a, b) => a.order - b.order);
      title = 'Monthly Data';
      
      // Try to determine what kind of monthly data this is
      if (text.toLowerCase().includes('temperature') || text.toLowerCase().includes('weather')) {
        title = 'Monthly Temperature Data';
      } else if (text.toLowerCase().includes('sales') || text.toLowerCase().includes('revenue')) {
        title = 'Monthly Sales Data';
      } else if (text.toLowerCase().includes('growth') || text.toLowerCase().includes('gdp')) {
        title = 'Monthly Growth Data';
      }
      
      return {
        data: results,
        title,
        source: 'time series data'
      };
    }
    
    // If no month data, try quarters
    const quarterPattern = /Q([1-4])[^:]*?:\s*([0-9.]+)|Quarter\s*([1-4])[^:]*?:\s*([0-9.]+)/gi;
    
    const quarterResults = [];
    while ((match = quarterPattern.exec(text)) !== null) {
      const quarter = match[1] || match[3];
      const value = parseFloat(match[2] || match[4]);
      
      if (!isNaN(value)) {
        quarterResults.push({
          name: `Q${quarter}`,
          value,
          order: parseInt(quarter)
        });
      }
    }
    
    if (quarterResults.length > 0) {
      quarterResults.sort((a, b) => a.order - b.order);
      return {
        data: quarterResults,
        title: 'Quarterly Data',
        source: 'time series data'
      };
    }
    
    // If no quarter data, try years
    const yearPattern = /(20\d\d)[^:]*?:\s*([0-9.]+)/g;
    
    const yearResults = [];
    while ((match = yearPattern.exec(text)) !== null) {
      const year = match[1];
      const value = parseFloat(match[2]);
      
      if (!isNaN(value)) {
        yearResults.push({
          name: year,
          value,
          order: parseInt(year)
        });
      }
    }
    
    if (yearResults.length > 0) {
      yearResults.sort((a, b) => a.order - b.order);
      return {
        data: yearResults,
        title: 'Yearly Data',
        source: 'time series data'
      };
    }
    
    // If we couldn't find any time data, return sample data
    return generateSampleData('No time series data found');
  }
  
  /**
   * Check if the text contains percentage data
   */
  function containsPercentageData(text) {
    return text.includes('%') || /\d+(\.\d+)?\s*percent/i.test(text);
  }
  
  /**
   * Extract percentage data from text
   */
  function extractPercentageData(text) {
    const results = [];
    
    // Pattern for "Term: X%" or "Term (X%)"
    const percentPattern1 = /([\w\s]+?):\s*(\d+(?:\.\d+)?)\s*%/g;
    const percentPattern2 = /([\w\s]+?)\s*\((\d+(?:\.\d+)?)\s*%\)/g;
    
    let match;
    while ((match = percentPattern1.exec(text)) !== null) {
      const term = match[1].trim();
      const value = parseFloat(match[2]);
      
      if (!isNaN(value)) {
        results.push({
          name: term,
          value,
          isPercentage: true
        });
      }
    }
    
    // Reset regex state
    percentPattern1.lastIndex = 0;
    
    while ((match = percentPattern2.exec(text)) !== null) {
      const term = match[1].trim();
      const value = parseFloat(match[2]);
      
      if (!isNaN(value)) {
        results.push({
          name: term,
          value,
          isPercentage: true
        });
      }
    }
    
    // Determine an appropriate title
    let title = 'Percentage Data';
    if (text.toLowerCase().includes('market') && text.toLowerCase().includes('share')) {
      title = 'Market Share';
    } else if (text.toLowerCase().includes('growth')) {
      title = 'Growth Percentages';
    } else if (text.toLowerCase().includes('distribution')) {
      title = 'Distribution Percentages';
    }
    
    return {
      data: results.length > 0 ? results : generateSampleData('No percentage data found').data,
      title,
      source: 'percentage data'
    };
  }
  
  /**
   * Check if the text contains bullet points
   */
  function containsBulletPoints(text) {
    return /^[ \t]*[-•*+][ \t]/m.test(text) || /^[ \t]*\d+\.[ \t]/m.test(text);
  }
  
  /**
   * Extract data from bullet points
   */
  function extractBulletPointData(text) {
    const results = [];
    
    // Split text into lines
    const lines = text.split('\n');
    
    // Patterns for different types of bullet points
    const bulletPatterns = [
      /^[ \t]*[-•*+][ \t]+(.*?):\s*(\d+(?:\.\d+)?)/,  // - Term: 123
      /^[ \t]*\d+\.[ \t]+(.*?):\s*(\d+(?:\.\d+)?)/    // 1. Term: 123
    ];
    
    for (const line of lines) {
      for (const pattern of bulletPatterns) {
        const match = line.match(pattern);
        if (match) {
          const term = match[1].trim();
          const value = parseFloat(match[2]);
          
          if (!isNaN(value)) {
            results.push({
              name: term,
              value
            });
          }
          
          break; // Move to next line after finding a match
        }
      }
    }
    
    return {
      data: results.length > 0 ? results : generateSampleData('No bullet point data found').data,
      title: 'Bullet Point Data',
      source: 'bullet points'
    };
  }
  
  /**
   * Extract data from general text
   */
  function extractGeneralTextData(text) {
    const results = [];
    
    // Pattern for "Term: Value" or "Term - Value"
    const keyValuePattern = /([^:\n-]+)[:-]\s*(\d+(?:\.\d+)?)/g;
    
    let match;
    while ((match = keyValuePattern.exec(text)) !== null) {
      const term = match[1].trim();
      const value = parseFloat(match[2]);
      
      // Skip very short terms that might not be meaningful
      if (term.length > 2 && !isNaN(value)) {
        results.push({
          name: term,
          value
        });
      }
    }
    
    // Try to extract numerically spelled words
    const wordNumberResults = extractWordNumbers(text);
    if (wordNumberResults.length > 0) {
      results.push(...wordNumberResults);
    }
    
    // If we found data, return it
    if (results.length > 0) {
      return {
        data: results,
        title: 'Extracted Data',
        source: 'text analysis'
      };
    }
    
    // Last resort: extract sentences with numbers
    const sentenceResults = extractSentenceNumbers(text);
    if (sentenceResults.length > 0) {
      return {
        data: sentenceResults,
        title: 'Text Analysis',
        source: 'sentence analysis'
      };
    }
    
    return generateSampleData('No data patterns found in text');
  }
  
  /**
   * Extract numbers written as words (e.g., "twenty-five")
   */
  function extractWordNumbers(text) {
    const results = [];
    const wordToNumber = {
      'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
      'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
      'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
      'eighty': 80, 'ninety': 90
    };
    
    // Pattern for "Term: twenty-five" or "Term: twenty five"
    const wordNumberPattern = /([^:\n]+):\s*((?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[-\s](?:one|two|three|four|five|six|seven|eight|nine))?)/gi;
    
    let match;
    while ((match = wordNumberPattern.exec(text)) !== null) {
      const term = match[1].trim();
      const numberWord = match[2].toLowerCase();
      
      // Handle compound numbers (e.g., "twenty-five" or "twenty five")
      let value = 0;
      if (numberWord.includes('-') || numberWord.includes(' ')) {
        const parts = numberWord.split(/[-\s]+/);
        if (parts.length === 2 && wordToNumber[parts[0]] !== undefined && wordToNumber[parts[1]] !== undefined) {
          value = wordToNumber[parts[0]] + wordToNumber[parts[1]];
        }
      } else if (wordToNumber[numberWord] !== undefined) {
        value = wordToNumber[numberWord];
      }
      
      if (value > 0) {
        results.push({
          name: term,
          value
        });
      }
    }
    
    return results;
  }
  
  /**
   * Extract numeric values from sentences
   */
  function extractSentenceNumbers(text) {
    const results = [];
    
    // Split into sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    for (const sentence of sentences) {
      // Find numbers in the sentence
      const numbers = sentence.match(/\d+(?:\.\d+)?/g);
      if (numbers && numbers.length > 0) {
        const value = parseFloat(numbers[0]);
        if (!isNaN(value)) {
          // Create a shortened name from the sentence
          const words = sentence.trim().split(/\s+/);
          const name = words.length > 5 
            ? words.slice(0, 5).join(' ') + '...'
            : sentence.trim();
          
          results.push({
            name,
            value,
            fullText: sentence.trim()
          });
        }
      }
    }
    
    return results;
  }
  
  /**
   * Generate sample data when no usable data is found
   */
  export function generateSampleData(message) {
    return {
      data: [
        { name: 'Sample A', value: 400 },
        { name: 'Sample B', value: 300 },
        { name: 'Sample C', value: 200 },
        { name: 'Sample D', value: 100 },
        { name: message, value: 50 }
      ],
      title: 'Sample Data',
      source: 'sample'
    };
  }
  
  /**
   * Get appropriate color scheme based on data source
   */
  export function getColorScheme(source) {
    switch (source) {
      case 'currency data':
        return ['#2E8B57', '#3CB371', '#66CDAA', '#8FBC8F', '#90EE90']; // Green palette
      case 'percentage data':
        return ['#4682B4', '#5F9EA0', '#6495ED', '#7B68EE', '#87CEFA']; // Blue palette
      case 'time series data':
        return ['#D2691E', '#CD853F', '#F4A460', '#DEB887', '#FFE4C4']; // Brown palette
      default:
        return ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe']; // Default palette
    }
  }