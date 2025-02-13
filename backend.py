from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import sqlite3
import pandas as pd

app = Flask(__name__, template_folder="templates",static_folder='static')
CORS(app)

DATABASE = "complaints.db"

def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        problem_type TEXT,
        severity INTEGER,
        description TEXT,
        location TEXT
    )''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        content TEXT,
        author TEXT
    )''')
    conn.commit()
    conn.close()

init_db()

# Route to serve the index.html
@app.route('/')
def home():
    return render_template('index.html')
@app.route('/home')
def home_page():
    return render_template('index.html')

@app.route('/map')
def map_page():
    return render_template('page2.html')

@app.route('/alert')
def alert_page():
    return render_template('page4.html')

@app.route('/contact')
def contact_page():
    return render_template('SOS.html')

@app.route('/report')
def report_page():
    return render_template('frontend.html')

@app.route('/community')
def community_page():
    return render_template('community.html')

@app.route('/submit', methods=['POST'])
def submit_complaint():
    data = request.get_json()
    problem_type = data.get("problemType")
    severity = data.get("severity")
    description = data.get("description")
    location = data.get("location")

    if not (problem_type and severity and description and location):
        return jsonify({"message": "All fields are required!"}), 400

    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO complaints (problem_type, severity, description, location) VALUES (?, ?, ?, ?)",
            (problem_type, severity, description, location)
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "Complaint submitted successfully!"}), 201
    except Exception as e:
        return jsonify({"message": f"Error submitting complaint: {str(e)}"}), 500


@app.route('/chart-data', methods=['GET'])
def chart_data():
    try:
        conn = sqlite3.connect(DATABASE)
        df = pd.read_sql_query("""
            SELECT location, SUM(severity) as total_severity
            FROM complaints
            GROUP BY location
        """, conn)
        conn.close()

        labels = df["location"].tolist()
        data = df["total_severity"].tolist()

        return jsonify({"labels": labels, "data": data})
    except Exception as e:
        return jsonify({"message": f"Error getting chart data: {str(e)}"}), 500


@app.route('/red-zones', methods=['GET'])
def red_zones():
    try:
        conn = sqlite3.connect(DATABASE)
        df = pd.read_sql_query("""
            SELECT location, COUNT(*) as count, SUM(severity) as total_severity
            FROM complaints
            GROUP BY location
            ORDER BY total_severity DESC
        """, conn)
        conn.close()

        red_zones_data = []
        for index, row in df.iterrows():
            count = row['count']
            total_severity = row['total_severity']
            if count > 0:
                priority = "High" if total_severity > 15 else "Medium" if total_severity > 5 else "Low"
                latitude = 28.6139 + index * 0.01  # Dummy Latitude
                longitude = 77.2090 + index * 0.01  # Dummy Longitude
                red_zones_data.append({
                    "location": row['location'],
                    "priority": priority,
                    "count": count,
                    "latitude": latitude,
                    "longitude": longitude
                })

        return jsonify(red_zones_data)
    except Exception as e:
        return jsonify({"message": f"Error getting red zone data: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(debug=True)
