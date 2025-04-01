import spacy
import re
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# Load NLP models
nlp = spacy.load("en_core_web_sm")
model = SentenceTransformer('all-MiniLM-L6-v2')

# Define visualization categories with expanded descriptions
chart_types = {
    "area_chart": "Shows cumulative data trends with a filled area. Best for visualizing continuous data over time with emphasis on magnitude.",
    "bar_chart": "Used for comparing categories or ranking values. Ideal for contrasting discrete items or showing rankings across categories.",
    "chord_diagram": "Best for visualizing relationships and interactions between groups. Shows complex interconnections and flow between entities.",
    "circle_packing": "Represents hierarchical relationships in a compact form. Efficient for displaying nested categories with size proportions.",
    "connection_map": "Visualizes spatial relationships and geographic data. Perfect for showing connections between locations or regions.",
    "DAG": "Shows directed relationships, commonly used for processes or networks. Ideal for workflows, dependencies, or sequential processes.",
    "donut_chart": "A variation of the pie chart highlighting proportions. Perfect for showing part-to-whole relationships and category distributions.",
    "heatmap_chart": "Displays intensity values in a matrix format. Best for showing patterns and correlations in multi-dimensional data.",
    "line_chart": "Best for showing trends over time or sequential data. Ideal for continuous changes and comparing multiple series over time.",
    "mosaic_plot": "Used to show the relationship between categorical variables. Good for displaying contingency tables and categorical correlations.",
    "network_graph": "Illustrates complex relationships in networks. Best for showing connections, influence, and cluster patterns.",
    "polar_area": "Represents cyclic data with proportionally scaled segments. Good for seasonal or periodic data with magnitude variations.",
    "small_multiples": "Facilitates comparisons across multiple categories. Displays a series of similar charts for different data subsets.",
    "stacked_area_chart": "Shows part-to-whole relationships over time. Good for displaying how composition changes while maintaining total perspective.",
    "sunburst_chart": "Depicts hierarchical data as concentric layers. Excellent for multi-level hierarchical data with nested relationships.",
    "tree_diagram": "Illustrates hierarchical relationships in tree structure. Clearly shows parent-child relationships and organizational structures.",
    "treemap_chart": "Depicts hierarchical structures using nested rectangles. Good for showing hierarchical data where size represents quantity.",
    "voronoi_map": "Divides spatial regions based on distance. Useful for proximity analysis and territory visualization.",
    "word_cloud": "Visualizes common words and keyword frequency in text-heavy data. Great for displaying popular terms and themes."
}

# Precompute chart category embeddings
category_embeddings = {
    chart: model.encode(description, normalize_embeddings=True)
    for chart, description in chart_types.items()
}


# Enhanced feature extraction with more specific pattern recognition
def extract_features(query, response):
    """Extracts key elements from the query-response pair with enhanced detection."""
    combined_text = query + " " + response
    doc = nlp(combined_text)
    
    # Basic numerical and location features
    numbers = [token.text for token in doc if token.like_num]
    locations = [ent.text for ent in doc.ents if ent.label_ in {"GPE", "LOC"}]
    
    # Enhanced keyword detection with more nuanced categories
    trend_keywords = {"increase", "decline", "growth", "rise", "drop", "trend", "fall", "reduce", "expansion", 
                     "fluctuation", "progression", "evolution", "trajectory", "historical", "over time", 
                     "increased", "decreased", "grew", "fell", "risen", "trending"}
    
    relationship_keywords = {"prefer", "dominate", "compared", "versus", "majority", "minority", "correlation", 
                           "causation", "influence", "impact", "affect", "between", "connection", "network", 
                           "interaction", "collaboration", "flow", "transfer", "connected", "linked", "relation",
                           "mapping", "connect", "link", "association", "interact"}
    
    hierarchy_keywords = {"structure", "hierarchy", "nested", "parent", "child", "tree", "branch", "root", 
                        "descendant", "ancestor", "organization", "breakdown", "composition", "contains",
                        "hierarchical", "level", "tier", "layer", "subordinate", "superordinate", "category",
                        "subcategory", "classification", "taxonomy", "class", "subclass"}
    
    part_to_whole_keywords = {"percentage", "proportion", "fraction", "share", "allocation", "distribution", 
                            "segment", "portion", "division", "makeup", "composition", "constituent", "breakdown",
                            "ratio", "percent", "split", "divided", "parts", "pieces", "sections", "components",
                            "pie", "slice", "segment", "partition", "make up", "comprises", "consists of"}
    
    comparison_keywords = {"versus", "against", "compare", "contrast", "difference", "similarity", 
                         "benchmark", "outperform", "underperform", "rank", "exceed", "more than", "less than",
                         "higher", "lower", "better", "worse", "comparison", "relative", "compared to"}
    
    # Extract lemmatized keywords for each category
    trends = [token.lemma_ for token in doc if token.lemma_ in trend_keywords]
    relationships = [token.lemma_ for token in doc if token.lemma_ in relationship_keywords]
    hierarchies = [token.lemma_ for token in doc if token.lemma_ in hierarchy_keywords]
    part_to_whole = [token.lemma_ for token in doc if token.lemma_ in part_to_whole_keywords]
    comparisons = [token.lemma_ for token in doc if token.lemma_ in comparison_keywords]
    
    # Detect temporal elements (dates, time periods)
    has_time_series = any(ent.label_ == "DATE" or ent.label_ == "TIME" for ent in doc.ents)
    has_multiple_dates = len([ent for ent in doc.ents if ent.label_ == "DATE"]) > 1
    
    # Check for multi-dimensional data mentions
    multi_dimensional = "by" in [token.text.lower() for token in doc] and len(numbers) > 5
    
    # Check for distribution patterns
    distribution_keywords = {"distribution", "frequency", "spread", "range", "variance", "outlier"}
    has_distribution = any(token.lemma_ in distribution_keywords for token in doc)
    
    # Detect categorical data
    categories_count = len([ent for ent in doc.ents if ent.label_ == "ORG" or ent.label_ == "PRODUCT"])
    has_categories = categories_count > 2
    
    # Detect percentage patterns
    percentage_indicators = len([token for token in doc if token.text == "%"])
    percentage_indicators += len(re.findall(r'\d+%', combined_text))
    
    # Detect phrases like "X accounts for Y%" or "X makes up Y%"
    proportion_phrases = len(re.findall(r'(account|make|constitute|represent)s? for|up \d+%', combined_text))
    
    # Look for enumeration of items that together form 100%
    sum_to_whole = False
    percentage_values = [float(token.text.replace('%', '')) for token in doc 
                      if token.like_num and '%' in token.text + (doc[token.i + 1].text if token.i + 1 < len(doc) else "")]
    
    if percentage_indicators > 2 and len(percentage_values) > 2:
        # Check if percentages approximately sum to 100
        percentage_sum = sum(num for num in percentage_values if num <= 100)
        sum_to_whole = 95 <= percentage_sum <= 105
    
    return {
        "numbers": numbers,
        "locations": locations,
        "trends": trends,
        "relationships": relationships,
        "hierarchies": hierarchies,
        "part_to_whole": part_to_whole,
        "comparisons": comparisons,
        "has_time_series": has_time_series,
        "has_multiple_dates": has_multiple_dates,
        "multi_dimensional": multi_dimensional,
        "has_distribution": has_distribution,
        "has_categories": has_categories,
        "location_count": len(locations),
        "is_text_heavy": len([token for token in doc if token.is_alpha and not token.is_stop]) > 30,
        "percentage_indicators": percentage_indicators,
        "proportion_phrases": proportion_phrases,
        "sum_to_whole": sum_to_whole
    }


# Analyze data structure in the response
def analyze_data_structure(response):
    """Analyzes potential data structure in the response to improve recommendations."""
    
    doc = nlp(response)
    
    # Check for tabular data
    has_table = False
    rows = response.split('\n')
    if len(rows) > 3:
        consistent_delimiters = all(row.count('|') == rows[0].count('|') for row in rows[:4]) and rows[0].count('|') > 0
        has_table = consistent_delimiters or (rows[0].count(',') > 2 and all(row.count(',') == rows[0].count(',') for row in rows[:4]))
    
    # Check for list structures
    has_lists = response.count('\n-') > 3 or response.count('\n•') > 3 or sum(1 for i, line in enumerate(rows) if line.strip().startswith(f"{i+1}.")) > 3
    
    # Check for hierarchical structure
    indentation_pattern = [len(line) - len(line.lstrip()) for line in rows if line.strip()]
    has_hierarchy = len(set(indentation_pattern)) > 2 and max(indentation_pattern) > 4
    
    # Check for time series data
    date_entities = [ent for ent in doc.ents if ent.label_ == "DATE"]
    has_dated_sequence = len(date_entities) > 3
    
    # Check for categorical groupings
    category_sentences = [sent for sent in doc.sents if any(ent.label_ in ["ORG", "PRODUCT", "GPE"] for ent in sent.ents)]
    has_categories = len(category_sentences) > 3
    
    return {
        "has_table": has_table,
        "has_lists": has_lists,
        "has_hierarchy": has_hierarchy,
        "has_dated_sequence": has_dated_sequence,
        "has_categories": has_categories
    }


# More sophisticated score boosting based on extracted features
def boost_scores(scores, features):
    """Enhances scores with more nuanced boosting for various chart types."""
    
    # Baseline boosts - applied more conservatively
    if features["trends"] and features["has_time_series"]:
        scores["line_chart"] += 0.4
        scores["area_chart"] += 0.3
    else:
        # If there are trends but no clear time series, don't automatically favor line charts
        if features["trends"]:
            scores["line_chart"] += 0.2
    
    # Network and relationship visualizations
    if len(features["relationships"]) > 2:
        scores["network_graph"] += 0.8
        scores["chord_diagram"] += 0.7
        scores["DAG"] += 0.6
    elif len(features["relationships"]) > 0:
        scores["network_graph"] += 0.4
        scores["chord_diagram"] += 0.3
        
    # Hierarchical data visualizations
    if len(features["hierarchies"]) > 2:
        scores["treemap_chart"] += 0.8
        scores["sunburst_chart"] += 0.7
        scores["circle_packing"] += 0.6
        scores["tree_diagram"] += 0.5
    elif len(features["hierarchies"]) > 0:
        scores["treemap_chart"] += 0.4
        scores["sunburst_chart"] += 0.3
        
    # Strong boost for clear part-to-whole data
    if features["sum_to_whole"]:
        scores["donut_chart"] += 0.9
        scores["treemap_chart"] += 0.6
    
    # Moderate boost for percentage indicators
    if features["percentage_indicators"] >= 3:
        scores["donut_chart"] += 0.7
    elif features["percentage_indicators"] > 0:
        scores["donut_chart"] += 0.4
    
    # Boost based on proportion phrases
    if features["proportion_phrases"] > 0:
        scores["donut_chart"] += 0.5
    
    # Boost based on part-to-whole keywords
    if len(features["part_to_whole"]) >= 3:
        scores["donut_chart"] += 0.8
    elif len(features["part_to_whole"]) > 0:
        scores["donut_chart"] += 0.4
    
    # Context-specific boost for category distribution questions
    if any(word in features["part_to_whole"] for word in ["breakdown", "distribution", "composition"]) and features["has_categories"]:
        scores["donut_chart"] += 0.6
    
    # Give stronger boost when time-series elements are NOT present (since donut charts aren't good for time series)
    if not features["has_time_series"] and len(features["part_to_whole"]) > 0:
        scores["donut_chart"] += 0.3
        
    # Geographic data
    if features["location_count"] > 3:
        scores["connection_map"] += 0.8
        scores["voronoi_map"] += 0.6
    elif features["location_count"] > 0:
        scores["connection_map"] += 0.5
        
    # Categorical comparisons
    if len(features["comparisons"]) > 2 and features["has_categories"]:
        scores["bar_chart"] += 0.5
        scores["mosaic_plot"] += 0.6
        scores["small_multiples"] += 0.7
    
    # Multi-dimensional data
    if features["multi_dimensional"]:
        scores["heatmap_chart"] += 0.8
        scores["small_multiples"] += 0.6
        
    # Distributions
    if features["has_distribution"]:
        scores["heatmap_chart"] += 0.6
        
    # Text-heavy responses
    if features["is_text_heavy"]:
        scores["word_cloud"] += 0.9
        
    # Apply penalties to overrecommended charts
    frequently_recommended = ["bar_chart", "line_chart", "area_chart"]
    for chart in frequently_recommended:
        # Apply a small penalty to frequently recommended charts
        # This helps diversify recommendations
        scores[chart] -= 0.1
        
    return scores


# Applies contextual awareness to chart recommendations
def context_aware_recommendations(query, response, features, similarity_scores):
    """Enhances recommendations based on query intent and context patterns."""
    
    query_lower = query.lower()
    
    # Direct visualization requests
    if "show hierarchy" in query_lower or "hierarchical" in query_lower:
        similarity_scores["treemap_chart"] += 0.5
        similarity_scores["sunburst_chart"] += 0.5
        similarity_scores["tree_diagram"] += 0.4
        
    if "show network" in query_lower or "connections between" in query_lower:
        similarity_scores["network_graph"] += 0.6
        similarity_scores["chord_diagram"] += 0.5
        
    if "over time" in query_lower or "trend" in query_lower:
        similarity_scores["line_chart"] += 0.4
        similarity_scores["area_chart"] += 0.3
        
    if "map" in query_lower or "geographic" in query_lower:
        similarity_scores["connection_map"] += 0.7
        similarity_scores["voronoi_map"] += 0.4
        
    if "comparison" in query_lower or "compare" in query_lower:
        similarity_scores["bar_chart"] += 0.4
        similarity_scores["small_multiples"] += 0.5

    # Direct indicators for distribution/proportion visualizations
    distribution_patterns = [
        "what is the breakdown of", "how is .* distributed", 
        "what percentage", "what proportion", "what is the split",
        "what are the percentages", "show .* distribution",
        "pie chart", "donut chart", "composition of", "makeup of"
    ]
    
    for pattern in distribution_patterns:
        if re.search(pattern, query_lower):
            similarity_scores["donut_chart"] += 0.7
    
    # Detect questions about market share, budget allocation, or demographic breakdown
    if any(term in query_lower for term in ["market share", "budget allocation", "demographic", "voter"]):
        if not features["has_time_series"]:  # Not asking for trends over time
            similarity_scores["donut_chart"] += 0.6
    
    # Detect "top" categories that make up a whole
    if "top" in query_lower and any(term in query_lower for term in ["categories", "segments", "components"]):
        similarity_scores["donut_chart"] += 0.5
        
    # Data characteristic detection
    if features["has_time_series"] and len(features["part_to_whole"]) > 0:
        similarity_scores["stacked_area_chart"] += 0.7
        
    if features["has_categories"] and features["multi_dimensional"]:
        similarity_scores["heatmap_chart"] += 0.6
        similarity_scores["small_multiples"] += 0.5
        
    # Process flow detection
    process_flow_keywords = {"process", "workflow", "sequence", "step", "procedure"}
    has_process_flow = any(token.lemma_ in process_flow_keywords for token in nlp(query + " " + response))
    if has_process_flow:
        similarity_scores["DAG"] += 0.7
        
    # Detect correlation analysis
    correlation_keywords = {"correlation", "relationship", "association", "connected"}
    has_correlation = any(token.lemma_ in correlation_keywords for token in nlp(query + " " + response))
    if has_correlation:
        similarity_scores["heatmap_chart"] += 0.5
        similarity_scores["network_graph"] += 0.4
        
    return similarity_scores


# Returns a contextual description of why a chart was recommended
def get_chart_description(chart_type, features):
    """Provides explanatory descriptions of chart recommendations based on detected features."""
    
    descriptions = {
        "area_chart": "Recommended for showing continuous data trends over time with emphasis on magnitude.",
        "bar_chart": "Ideal for comparing discrete categories or showing rankings.",
        "chord_diagram": "Best for showing complex relationships and interactions between groups.",
        "circle_packing": "Excellent for displaying hierarchical data with size relationships.",
        "connection_map": "Perfect for geographic data showing relationships between locations.",
        "DAG": "Ideal for visualizing directed processes, workflows, or dependencies.",
        "donut_chart": "Perfect for showing part-to-whole relationships and proportional data.",
        "heatmap_chart": "Best for showing patterns in multi-dimensional categorical data.",
        "line_chart": "Excellent for time series data and continuous trends.",
        "mosaic_plot": "Useful for showing relationships between multiple categorical variables.",
        "network_graph": "Ideal for visualizing complex interconnected relationships.",
        "polar_area": "Good for cyclic data or comparing multiple quantitative variables.",
        "small_multiples": "Perfect for comparing patterns across different categories or groups.",
        "stacked_area_chart": "Best for showing part-to-whole relationships changing over time.",
        "sunburst_chart": "Excellent for multi-level hierarchical data with nesting.",
        "tree_diagram": "Ideal for displaying hierarchical relationships with clear parent-child structure.",
        "treemap_chart": "Best for hierarchical data where size represents quantity.",
        "voronoi_map": "Good for spatial partitioning and proximity analysis.",
        "word_cloud": "Perfect for showing frequency in text data and key themes."
    }
    
    contextual_reasons = {
        "area_chart": "time series data" if features["has_time_series"] else "cumulative values",
        "bar_chart": "categorical comparison" if features["has_categories"] else "ranking data",
        "chord_diagram": "complex relationship data" if len(features["relationships"]) > 1 else "interconnected groups",
        "treemap_chart": "hierarchical data with size components" if len(features["hierarchies"]) > 0 else "nested categories",
        "network_graph": "network connections" if len(features["relationships"]) > 2 else "relationship mapping",
        "heatmap_chart": "multi-dimensional data patterns" if features["multi_dimensional"] else "correlation analysis",
        "word_cloud": "text analysis" if features["is_text_heavy"] else "keyword frequency",
        "connection_map": "geographic relationships" if features["location_count"] > 2 else "spatial data",
        "donut_chart": "percentage distribution" if features["percentage_indicators"] > 2 
                      else "category proportions" if features["has_categories"] 
                      else "part-to-whole relationships"
    }
    
    base_description = descriptions.get(chart_type, "Visualization type")
    context = contextual_reasons.get(chart_type, "")
    
    if context:
        return f"{base_description} (Detected {context})"
    return base_description


# Improved visualization recommendations with diversity
def recommend_visualizations(query, response):
    """Recommends a diverse set of visualizations based on query and response content."""
    features = extract_features(query, response)
    response_embedding = model.encode(query + " " + response, normalize_embeddings=True)

    # Base similarity scores
    similarity_scores = {
        chart: cosine_similarity([response_embedding], [embedding]).flatten()[0]
        for chart, embedding in category_embeddings.items()
    }

    # Apply feature-based score boosts
    similarity_scores = boost_scores(similarity_scores, features)
    
    # Apply contextual awareness
    similarity_scores = context_aware_recommendations(query, response, features, similarity_scores)

    # Define chart categories for diversity
    chart_categories = {
        "time_series": ["line_chart", "area_chart", "stacked_area_chart"],
        "hierarchical": ["treemap_chart", "sunburst_chart", "circle_packing", "tree_diagram"],
        "relational": ["network_graph", "chord_diagram", "DAG"],
        "comparison": ["bar_chart", "small_multiples", "mosaic_plot"],
        "geographic": ["connection_map", "voronoi_map"],
        "distribution": ["heatmap_chart"],
        "proportion": ["donut_chart"],  # Give donut_chart its own category
        "text": ["word_cloud"]
    }
    
    # Create ranked list
    ranked_charts = sorted(similarity_scores.items(), key=lambda x: x[1], reverse=True)
    
    # Check if donut chart should be forced into recommendations
    force_donut = False
    if (len(features["part_to_whole"]) > 1 or features["percentage_indicators"] > 2 or features["sum_to_whole"]) and not features["has_time_series"]:
        donut_score = similarity_scores.get("donut_chart", 0)
        if donut_score > 0.3:  # If it has a reasonable score
            force_donut = True
    
    # Ensure diversity by taking top charts from different categories
    diverse_recommendations = []
    used_categories = set()
    
    # First, add the top overall recommendation
    top_chart, top_score = ranked_charts[0]
    diverse_recommendations.append((top_chart, top_score))
    
    # Find which category the top chart belongs to
    for category, charts in chart_categories.items():
        if top_chart in charts:
            used_categories.add(category)
            break
    
    # Then add top recommendations from other categories
    for chart, score in ranked_charts[1:]:
        if len(diverse_recommendations) >= 4:
            break
            
        # Find which category this chart belongs to
        chart_category = None
        for category, charts in chart_categories.items():
            if chart in charts:
                chart_category = category
                break
                
        # Add this chart if we haven't used its category yet or if it's high-scoring
        if chart_category not in used_categories or score > 0.8:
            diverse_recommendations.append((chart, score))
            if chart_category:
                used_categories.add(chart_category)
    
    # Force include donut chart if appropriate
    if force_donut and all(chart != "donut_chart" for chart, _ in diverse_recommendations):
        # Replace the lowest scoring recommendation with donut_chart
        diverse_recommendations = sorted(diverse_recommendations, key=lambda x: x[1])
        diverse_recommendations[0] = ("donut_chart", similarity_scores["donut_chart"])
        diverse_recommendations = sorted(diverse_recommendations, key=lambda x: x[1], reverse=True)
    
    # Normalize scores for better ranking
    max_score = max(score for _, score in diverse_recommendations)
    min_score = min(score for _, score in diverse_recommendations)
    
    if max_score - min_score > 0:  # Avoid division by zero
        normalized_recommendations = []
        for chart, score in diverse_recommendations:
            normalized_score = round((score - min_score) / (max_score - min_score), 2)
            normalized_recommendations.append((chart, normalized_score))
        return normalized_recommendations
    
    return [(chart, round(score, 2)) for chart, score in diverse_recommendations]


# Main function to get visualization recommendations
def getViz(user_query, response):
    """Main function to recommend visualizations with enhanced features."""
    
    # Extract features from query and response
    features = extract_features(user_query, response)
    
    # Analyze data structure
    data_structure = analyze_data_structure(response)
    
    # Combine data structure insights with features
    for key, value in data_structure.items():
        features[key] = value
    
    # Get recommendations with improved algorithm
    recommended_charts = recommend_visualizations(user_query, response)
    
    # Add explanations for why each chart was recommended
    recommendations_with_explanations = []
    for chart, score in recommended_charts:
        explanation = get_chart_description(chart, features)
        recommendations_with_explanations.append((chart, score, explanation))
        
    # Print recommendations with explanations
    for chart, score, explanation in recommendations_with_explanations:
        print(f"{chart}: {score} - {explanation}")

    return recommended_charts