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
MONGO_URI = os.getenv("MONGODB_URINEW", "mongodb://localhost:27017/")

# === API Setup ===
BASE_URL = "https://dev-rspl-imlsp.lendenclub.com/v1"
PARTNER_CODE = "KC"
KEY = "76f541a77bb26ff4389c47ede508c80f"   # utf-8 string
IV = "8795d9c2dfda62da"                   # utf-8 string
AES_BLOCK_SIZE = 32
BATCH_SIZE = 50

# === MongoDB Setup ===
client = MongoClient(MONGO_URI)
db = client["KeshvaCredit"]
collection = db["smcoll"]
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

    try:
        res = requests.post(url, json=body, timeout=15)
        res_json = res.json()

        if "payload" in res_json:
            try:
                decrypted = decrypt_aes(res_json["payload"], KEY, IV)
                return {
                    "encrypted": res_json,
                    "decrypted": json.loads(decrypted),
                }
            except Exception as e:
                return {"error": f"Decrypt failed: {str(e)}", "encrypted": res_json}
        return {"error": "Invalid response", "raw": res.text}
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

# === Payload Builders ===
def build_lead_payload(user):
    # Get the DOB from the user dictionary
    dob_str = user.get("dob")
    formatted_dob = "01/01/1990"  # Default value

    if dob_str:
        try:
            # 1. Parse the existing date string (e.g., '1988-10-26')
            date_obj = datetime.strptime(dob_str, "%Y-%m-%d")
            
            # 2. Format the date object into the required string (e.g., '26/10/1988')
            formatted_dob = date_obj.strftime("%d/%m/%Y")
            
        except ValueError:
            # Handle cases where the DOB might not be in the expected 'YYYY-MM-DD' format
            print(f"⚠️ Warning: Could not parse DOB '{dob_str}'. Using default.")
            pass # Keep the default '01/01/1990'

    return {
        "params": {},
        "fields": {},
        "json": {
            "basic_details": {
                "mobile_number": str(user.get("phone", "9999999999")),
                "email": user.get("email", "test@gmail.com"),
                "name": user.get("name", "Demo User"),
                "pan": user.get("pan", "ABCDE1234F"),
                "date_of_birth": formatted_dob, # <-- Use the new formatted date here
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
        print(f"🚀 Processing user {phone}")

        dedupe_resp = call_api("BORROWER_USER_DEDUPE", build_dedupe_payload(user))
        lead_resp = call_api("CREATE_LEAD_API", build_lead_payload(user))

        instamoney_data = {"dedupe": dedupe_resp, "lead": lead_resp}

        update_doc = {
            "$push": {
                "apiResponse": {
                    "Instamoney": instamoney_data,
                    "createdAt": datetime.utcnow().isoformat(),
                },
                "RefArr": {"name": "Instamoney", "createdAt": datetime.utcnow().isoformat()},
            },
            "$unset": {"accounts": ""},
        }

        collection.update_one({"_id": user["_id"]}, update_doc)
        print(f"✅ Updated DB for {phone}")

# === Main Loop ===
def process_data():
    skip = 0
    while True:
        users = list(
            collection.find(
                {
                    "$or": [
                        {"RefArr": {"$exists": False}},
                        {"RefArr.name": {"$ne": "Instamoney"}},
                    ]
                }
            )
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

if __name__ == "__main__":
    process_data()
