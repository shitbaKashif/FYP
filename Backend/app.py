from flask import Flask, request, jsonify
from flask_cors import CORS
import kg_chat
import vrs
import json
import traceback
from crontab import CronTab
import os
import numpy as np

app = Flask(__name__)
CORS(app)  # Enable cross-origin requests

# Constants
CRON_COMMAND = "Backend\subreddit_topics.json"  # Update with your actual cron script path
SUBREDDIT_JSON_PATH = os.path.join(os.path.dirname(__file__), "subreddit_topics.json")

# Load subreddit data
def load_subreddit_data():
    try:
        with open(SUBREDDIT_JSON_PATH, 'r') as file:
            return json.load(file)
    except Exception as e:
        print(f"Error loading subreddit_topics.json: {str(e)}")
        return {
            "TravelHacks": [
                "iterninary", "mexican", "searched", "prepared", 
                "pack", "lagging", "trolley"
            ],
            "CryptoCurrency": [
                "kanye", "adress", "brightly", "aped", 
                "pointless", "awakens", "tulsi"
            ]
        }

# Add this helper function at the top (or near your imports)
def convert_numpy_types(obj):
    if isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(i) for i in obj]
    elif isinstance(obj, tuple):
        return tuple(convert_numpy_types(i) for i in obj)
    elif isinstance(obj, np.generic):
        return obj.item()
    else:
        return obj

@app.route('/api/chat', methods=['POST'])
def chat_endpoint():
    data = request.json
    user_query = data.get('user_query')
    userID = data.get('userID')
    subreddit = data.get('subreddit')
    topics = data.get('topics')
    
    if not all([user_query, userID, subreddit, topics]):
        return jsonify({"error": "Missing required parameters"}), 400
    
    try:
        # Call kg_chat function with all topics
        response = kg_chat.chat_with_kg(user_query, userID, subreddit, topics)
        return jsonify({"response": response})
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/visualize', methods=['POST'])
@app.route('/api/visualize', methods=['POST'])
def visualize_endpoint():
    data = request.json
    user_query = data.get('user_query')
    response = data.get('response')
    
    # Handle response if it's a dictionary
    if isinstance(response, dict) and 'response' in response:
        response = response['response']
    
    if not all([user_query, response]):
        return jsonify({"error": "Missing user_query or response"}), 400
    
    try:
        # Get visualization recommendations
        recommended_charts = vrs.getViz(user_query, response)
        print(recommended_charts)
        return jsonify(convert_numpy_types(recommended_charts))
    except Exception as e:
        print(f"Error in visualize endpoint: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/subreddits', methods=['GET'])
def subreddits_endpoint():
    # Load subreddits and topics from JSON file
    subreddit_topics = load_subreddit_data()
    return jsonify(subreddit_topics)

@app.route('/api/schedule', methods=['POST'])
def schedule_endpoint():
    data = request.json
    cronInterval = int(data.get('cronInterval', 0))
    cronStart = int(data.get('cronTime', 0))
    userID = data.get('userID')
    subreddit = data.get('subreddit')
    topics = data.get('topics')

    print(f"cron start: {cronStart}")
    print(f"cronInterval: {cronInterval}")
    print(f"Setting up cron for user: {userID}, subreddit: {subreddit}")

    try:
        if not cronStart and not cronInterval:
            print("empty")
            return jsonify({"error": "Nothing selected"}), 400

        if cronStart < 1 or cronStart > 23:
            print("start time not in range")
            return jsonify({"error": "invalid start time"})

        cron = CronTab(user=True)

        for job in cron:
            if job.command == CRON_COMMAND:
                print("cron exists")
                cron.remove(job)
                print("cron removed")

        new_job = cron.new(command=CRON_COMMAND)
        print(new_job, "\n")

        new_job.setall(f"{cronStart} */{cronInterval} * * *")
        print("cron set")
        cron.write()

        print("cron applied")
        return jsonify({"message": f"cronjob successfully applied at {cronStart} every {cronInterval} minutes"}), 200

    except Exception as e:
        print(f"Error setting up cron job: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)})

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "API is running"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)