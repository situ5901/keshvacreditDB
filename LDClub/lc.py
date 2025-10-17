import os
import json
import hashlib
import base64
import requests
from pymongo import MongoClient
from Crypto.Cipher import AES
from datetime import datetime
from dotenv import load_dotenv
import time

# === Load ENV ===
load_dotenv()
MONGO_URI = os.getenv("MONGODB_VISHU")

# === API Setup ===
BASE_URL = "https://dev-rspl-imlsp.lendenclub.com/v1"
PARTNER_CODE = "KC"
KEY = "76f541a77bb26ff4389c47ede508c80f"
IV = "8795d9c2dfda62da"
AES_BLOCK_SIZE = 32
BATCH_SIZE = 1

# === MongoDB Setup ===
client = MongoClient(MONGO_URI)
db = client["covermantra"]
collection = db["LoanTap"]
print("✅ MongoDB Connected Successfully")

# === Crypto Utils ===
def pad(data: str) -> bytes:
    pad_len = AES_BLOCK_SIZE - len(data.encode("utf-8")) % AES_BLOCK_SIZE
    return data.encode("utf-8") + bytes([pad_len] * pad_len)

def unpad(data: bytes) -> str:
    pad_len = data[-1]
    return data[:-pad_len].decode("utf-8")

def encrypt_aes(plain_text: str, key: str, iv: str) -> str:
    cipher = AES.new(key.encode("utf-8"), AES.MODE_CBC, iv.encode("utf-8"))
    encrypted = cipher.encrypt(pad(plain_text))
    return base64.b64encode(encrypted).decode("utf-8")

def decrypt_aes(encrypted_text: str, key: str, iv: str) -> str:
    cipher = AES.new(key.encode("utf-8"), AES.MODE_CBC, iv.encode("utf-8"))
    decrypted = cipher.decrypt(base64.b64decode(encrypted_text))
    return unpad(decrypted)

def generate_checksum(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()

# === API Caller ===
def call_api(api_code: str, data: dict):
    payload = {
        "params": data.get("params", {}),
        "fields": data.get("fields", {}),
        "json": data.get("json", {}),
        "attributes": data.get("attributes", {}),
        "api_code": api_code,
    }

    json_str = json.dumps(payload, separators=(",", ":"))
    encrypted_payload = encrypt_aes(json_str, KEY, IV)
    checksum = generate_checksum(encrypted_payload)

    body = {"checksum": checksum, "payload": encrypted_payload}
    url = f"{BASE_URL}/{PARTNER_CODE}/"

    print(f"DEBUG: Calling URL: {url} with api_code: {api_code}")

    try:
        res = requests.post(url, json=body, timeout=15)

        if res.status_code != 200:
            print(f"❌ API Error: HTTP Status Code {res.status_code}. Raw response text will be returned.")
            return {"error": f"HTTP Error {res.status_code}", "raw": res.text}

        if 'text/html' in res.headers.get('Content-Type', '').lower() or '<!DOCTYPE html>' in res.text.lower():
            print("❌ API Error: Server returned an HTML page instead of JSON. Check the API URL and Documentation.")
            return {"error": "Server returned HTML error page", "raw": res.text}

        try:
            res_json = res.json()
        except json.JSONDecodeError:
            try:
                bom_fixed_text = res.content.decode("utf-8-sig")
                res_json = json.loads(bom_fixed_text)
            except Exception as e:
                return {"error": f"JSON decode failed (BOM or invalid): {str(e)}", "raw": res.text}

        if "payload" in res_json:
            try:
                decrypted = decrypt_aes(res_json["payload"], KEY, IV)
                return {
                    "encrypted": res_json,
                    "decrypted": json.loads(decrypted),
                }
            except Exception as e:
                return {"error": f"Decrypt failed: {str(e)}", "encrypted": res_json}

        return {"error": "Invalid response or payload missing", "raw": res.text, "parsed_response": res_json}

    except Exception as e:
        return {"error": str(e)}

# === Payload Builders ===
def build_dedupe_payload(user):
    return {
        "params": {
            "pan": user.get("pan", ""),
            "mobile_number": str(user.get("phone", "")),
        },
        "fields": {},
        "json": {},
        "attributes": {},
    }

def build_lead_payload(user):
    dob_str = user.get("dob")
    formatted_dob = "01/01/1990"

    if dob_str:
        try:
            date_obj = datetime.strptime(dob_str, "%Y-%m-%d")
            formatted_dob = date_obj.strftime("%d/%m/%Y")
        except ValueError:
            print(f"⚠️ Warning: Could not parse DOB '{dob_str}'. Using default.")

    return {
        "params": {},
        "fields": {},
        "json": {
            "basic_details": {
                "mobile_number": str(user.get("phone", "9999999999")),
                "email": user.get("email", "test@gmail.com"),
                "name": user.get("name", "Demo User"),
                "pan": user.get("pan", "ABCDE1234F"),
                "date_of_birth": formatted_dob,
                "pincode": int(user.get("pincode", 400001)),
            },
            "professional_details": {
                "requested_amount": int(user.get("requested_amount", 10000)),
                "requested_interest_rate": 3,
                "occupation_type": user.get("occupation_type", "SALARIED"),
                "company_name": user.get("company_name", "COMPANY NAME"),
            },
        },
        "attributes": {},
    }

# === Batch Processor ===
def process_batch(users):
    for user in users:
        phone = user.get("phone")
        print(f"\n🚀 Processing user {phone}")

        dedupe_resp = call_api("BORROWER_USER_DEDUPE", build_dedupe_payload(user))
        lead_resp = call_api("CREATE_LEAD_API", build_lead_payload(user))

        lendenclub_data = {"dedupe": dedupe_resp, "lead": lead_resp}

        update_doc = {
            "$push": {
                "apiResponse": {
                    "LendenClub": lendenclub_data,
                    "createdAt": datetime.utcnow().isoformat(),
                },
                "RefArr": {"name": "LendenClub", "createdAt": datetime.utcnow().isoformat()},
            },
            "$unset": {"accounts": ""},
        }

        collection.update_one({"_id": user["_id"]}, update_doc)
        print(f"✅ Updated DB for {phone}")

# === Main Process Function ===
def process_data():
    skip = 0
    while True:
        # ✅ Fixed Query: Only those docs jinke RefArr me LendenClub nahi hai
        query = {
            "$or": [
                {"RefArr": {"$exists": False}},      # field nahi hai
                {"RefArr": {"$size": 0}},            # empty array
                {"RefArr.name": {"$ne": "LendenClub"}}  # LendenClub nahi hai
            ]
        }

        total = collection.count_documents(query)
        print(f"\n🔍 Total documents to process: {total}")

        users = list(
            collection.find(query)
            .skip(skip)
            .limit(BATCH_SIZE)
        )

        if not users:
            print("🚫 No more leads to process.")
            break

        process_batch(users)
        skip += len(users)
        time.sleep(1)

    print("🎯 All users processed successfully.")

# === Run Script ===
if __name__ == "__main__":
    process_data()
