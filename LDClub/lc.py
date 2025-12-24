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
MONGO_URI = os.getenv("MONGODB_CMLOOP")
if not MONGO_URI:
    raise ValueError("🚫 MONGODB_CMLOOP is not set in your .env file")

AES_CONFIG = {
    "key": "49dde96a1f057656ede3cf85f1be2b29",
    "iv": "a4da4265bfa4bac0"
}
AUTH_TOKEN = os.getenv("AUTH_TOKEN") or "bec3e2a583c644cb8b9614d4a60a99"
AES_BLOCK_SIZE = 32
BATCH_SIZE = 1
BASE_URL = "https://tsp-los.lendenclub.com/v2"

# === MongoDB Connection ===
try:
    client = MongoClient(MONGO_URI)
    db = client["covermantra"]
    collection = db["smcoll"]
    client.admin.command('ping')
    print("✅ MongoDB Connected Successfully")
except Exception as e:
    print(f"❌ MongoDB Connection Error: {e}")
    raise

# === AES Helper Functions ===
def pad(input_string: str) -> bytes:
    pad_len = AES_BLOCK_SIZE - (len(input_string.encode('utf-8')) % AES_BLOCK_SIZE)
    return input_string.encode('utf-8') + bytes([pad_len] * pad_len)

def unpad(input_bytes: bytes) -> str:
    pad_len = input_bytes[-1]
    return input_bytes[:-pad_len].decode('utf-8')

def encrypt_aes(plain_text: str, key: str, iv: str) -> str:
    cipher = AES.new(key.encode('utf-8'), AES.MODE_CBC, iv.encode('utf-8'))
    encrypted = cipher.encrypt(pad(plain_text))
    return base64.b64encode(encrypted).decode('utf-8')

def decrypt_aes(cipher_text: str, key: str, iv: str) -> str:
    cipher_bytes = base64.b64decode(cipher_text)
    cipher = AES.new(key.encode('utf-8'), AES.MODE_CBC, iv.encode('utf-8'))
    decrypted = cipher.decrypt(cipher_bytes)
    return unpad(decrypted)

def generate_checksum(encrypted_payload: str) -> str:
    return hashlib.sha256(encrypted_payload.encode('utf-8')).hexdigest()

# === API Call Function with Retry ===
def call_api(api_code: str, data: dict, retries=3):
    payload_dict = {
        "params": data.get("params", {}),
        "fields": data.get("fields", {}),
        "json": data.get("json", {}),
        "attributes": data.get("attributes", {}),
        "api_code": api_code,
    }

    json_str = json.dumps(payload_dict, separators=(",", ":"))
    encrypted_payload = encrypt_aes(json_str, AES_CONFIG["key"], AES_CONFIG["iv"])
    checksum = generate_checksum(encrypted_payload)
    body = {"checksum": checksum, "payload": encrypted_payload}

    headers = {
        "Content-Type": "application/json",
        "Authorization": AUTH_TOKEN,
        "api_code": api_code,
    }

    for attempt in range(1, retries + 1):
        try:
            res = requests.post(BASE_URL, headers=headers, json=body, timeout=15)
            if res.status_code != 200:
                print(f"❌ API Error (Attempt {attempt}): HTTP {res.status_code} — {res.text}")
                time.sleep(1)
                continue

            res_json = res.json()
            if "payload" not in res_json:
                print(f"⚠️ Missing payload in response: {res_json}")
                return {"error": "Invalid response", "raw": res.text, "parsed_response": res_json}

            decrypted = decrypt_aes(res_json["payload"], AES_CONFIG["key"], AES_CONFIG["iv"])
            decrypted_json = json.loads(decrypted)
            return {"encrypted": res_json, "decrypted": decrypted_json}

        except Exception as e:
            print(f"❌ Exception in API call (Attempt {attempt}): {e}")
            time.sleep(1)

    return {"error": f"Failed after {retries} attempts"}

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
        "params": {
            "product_code": "KC",        # Mandatory product code
            "partner_code": "KC_PARTNER" # Mandatory partner code
        },
        "fields": {},
        "json": {
            "basic_details": {
                "mobile_number": str(user.get("phone", "9999999999")),
                "email": user.get("email", "test@gmail.com"),
                "name": user.get("name", "Demo User"),
                "pan": user.get("pan", "ABCDE1234F"),
                "date_of_birth": formatted_dob
            },
            "address_details": {
                "type": "COMMUNICATION",
                "address_line": user.get("address_line", "Charni Road"),
                "pincode": int(user.get("pincode", 400001)),
                "state_code": user.get("state", "MH")
            },
            "professional_details": {
                "occupation_type": user.get("employment", "SALARIED"),
                "company_name": user.get("company_name", "COMPANY NAME"),
                "income": int(user.get("income", 30000))   # Mandatory
            },
            "consent_data": {
                "content": [
                    "We value your privacy. To proceed, we need your consent to collect and process your personal data such as name, phone number, and PAN details. By continuing, you agree to our Privacy Policy and Terms & Conditions."
                ],  
                "consent_dtm": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S.%f +0530")
            }
        },
        "attributes": {}
    }

# === Batch Processing ===
def process_batch(users):
    for user in users:
        phone = user.get("phone")
        print(f"🚀 Processing user {phone}")

        dedupe_resp = call_api("BORROWER_USER_DEDUPE", build_dedupe_payload(user))
        lead_resp = call_api("CREATE_LEAD_API_V2", build_lead_payload(user))

        lendenclub_data = {"dedupe": dedupe_resp, "lead": lead_resp}

        update_doc = {
            "$push": {
                "apiResponse": {"LendenClub": lendenclub_data, "createdAt": datetime.utcnow().isoformat()},
                "RefArr": {"name": "LendenClub", "createdAt": datetime.utcnow().isoformat()}
            },
            "$unset": {"accounts": ""}
        }

        try:
            collection.update_one({"_id": user["_id"]}, update_doc)
            print(f"✅ Updated DB for {phone}")
        except Exception as e:
            print(f"❌ Failed to update DB for {phone}: {e}")

# === Main Processing Loop ===
def process_data():
    while True:
        query = {
            "$or": [
                {"RefArr": {"$exists": False}},
                {"RefArr": {"$size": 0}},
                {"RefArr.name": {"$ne": "LendenClub"}}
            ]
        }

        total = collection.count_documents(query)
        print(f"\n🔍 Total documents to process: {total}")

        if total == 0:
            print("🚫 No more leads to process.")
            break

        users = list(collection.find(query).limit(BATCH_SIZE))
        process_batch(users)
        time.sleep(1)

    print("🎯 All users processed successfully.")

# === Entry Point ===
if __name__ == "__main__":
    process_data()
