import os
import json
import requests
from flask import Flask, render_template, request, jsonify
from flask import Response
from ontology import load_and_process_owl, generate_evaluation_scales

app = Flask(__name__)

owl_file_path = r'C:\Data\cinema.owl'

@app.route("/load-scales", methods=["GET"])
def load_scales():
    g, criteria = load_and_process_owl(owl_file_path)
    scales = generate_evaluation_scales(criteria, g)
    formatted_scales = {prop: details['details']['values'] for prop, details in scales.items() if details['type'] == 'Качественный'}
    print("Formatted scales: ", formatted_scales)
    return jsonify(formatted_scales)

@app.route("/load-quantitative-scales", methods=["GET"])
def load_quantitative_scales():
    g, criteria = load_and_process_owl(owl_file_path)
    scales = generate_evaluation_scales(criteria, g)
    quantitative_scales = {
        prop: {
            'min': details['details'].get('minInclusive', 'Не указано'),
            'max': details['details'].get('maxInclusive', 'Не указано')
        }
        for prop, details in scales.items() if details['type'] == 'Количественный'
    }
    return jsonify(quantitative_scales)

def send_json_data_to_api(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            json_data = json.load(file)
    except FileNotFoundError:
        return {"error": "Файл data.json не найден в папке 'Загрузки'"}
    except json.JSONDecodeError:
        return {"error": "Ошибка при чтении JSON-файла"}

    try:
        response = requests.post("http://127.0.0.1:1234/api/v1/make-decision", json=json_data)
        response.raise_for_status()
        response_data = response.json()
    except Exception as e:
        return {"error": f"Ошибка при отправке JSON-файла: {str(e)}"}

    return response_data

@app.route("/")
def index():
    return render_template("page.html")

@app.route("/send-json", methods=["POST"])
def send_json():
    downloads_folder = os.path.expanduser("~/Downloads")
    data_json_path = os.path.join(downloads_folder, "data.json")
    response_data = send_json_data_to_api(data_json_path)

    if response_data:
        return Response(json.dumps(response_data, ensure_ascii=False, indent=4), content_type='application/json; charset=utf-8')
    else:
        return jsonify({"error": "Ошибка при обработке данных"}), 400

if __name__ == "__main__":
    #print(load_scales())
    app.run(debug=True)

