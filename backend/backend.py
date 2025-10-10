from flask import Flask, request, send_file, jsonify
from dotenv import load_dotenv
from openai import OpenAI
from flask_cors import CORS
import os

load_dotenv()  # take environment variables from .env config file
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.route("/transcribe", methods=["POST"])
def transcribe():
    if not request.files:
        return jsonify({"error": "No file uploaded"}), 400
    audio = next(request.files.values())
    audio_path = f"/tmp/{audio.filename}"
    audio.save(audio_path)

    with open(audio_path, "rb") as f:
        transcription = client.audio.transcriptions.create(
            model="gpt-4o-transcribe", 
            file=f,
            response_format="verbose_json",
            timestamp_granularities=["word"],
            prompt="Act as a researcher in speech development for children. The following audio contains speech samples from children with impediments. Classify the speech given based on commonly mistaken word choices.",
            temperature=0.5
        )

    print(transcription.text)

    txt_path = audio_path.replace(".mp3", ".txt")
    with open(txt_path, "w") as out:
        out.write(transcription.text)

    return jsonify({
        "transcription": transcription.text,
        "download_url": f"http://127.0.0.1:5000/download/{os.path.basename(txt_path)}"
    })

@app.route("/download/<filename>")
def download(filename):
    return send_file(f"/tmp/{filename}", as_attachment=True)

if __name__ == "__main__":
    app.run(debug=True)