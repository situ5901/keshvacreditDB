import base64
import hashlib
import json
import requests
from Crypto.Cipher import AES
from pymongo import MongoClient
from datetime import datetime
import time
from dotenv import load_dotenv
import os
import asyncio

# === Load environment variables ===
load_dotenv()
MONGO_URI = os.getenv("MONGODB_SITU")

# === API Setup ===
API_URL = "https://dev-tsp-los.lendenclub.com/v2"
KEY = "03f4e9c37121bbe88545b5a06cd7e619"
IV = "47ed667825c963ab"
AUTH_TOKEN = "e70783bb76614b48a9299c77367748"
API_CODE = "CREATE_LEAD_API_V2"
AES_BLOCK_SIZE = 32
MAX_LEADS = 10

# === MongoDB Setup ===
client = MongoClient(MONGO_URI)
db = client.get_default_database()
UserDB = db["Componant"]

# === Crypto Utility Functions ===
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

# === API Call Per User ===
def sendToNewAPI(user):
    # Format DOB
    dob = user.get("dob")
    dob_formatted = "01/01/1990"
    if isinstance(dob, datetime):
        dob_formatted = dob.strftime("%d/%m/%Y")
    else:
        try:
            dob_str = str(dob).replace("Z", "")
            dob_parsed = datetime.fromisoformat(dob_str)
            dob_formatted = dob_parsed.strftime("%d/%m/%Y")
        except:
            print(f"⚠️ Invalid dob for {user.get('phone')} → using default")

    # Get current time from device for consent_dtm
    consent_dtm = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3] + " +0530"

    # Build Payload
    payload = {
        "payload": {
            "basic_details": {
                "mobile_number": str(user.get("phone")),
                "email": user.get("email", "na@example.com"),
                "name": user.get("name"),
                "pan": user.get("pan"),
                "date_of_birth": dob_formatted,
            },
            "address_details": {
                "address_line": user.get("address", "NA"),
                "pincode": user.get("pincode", 400001),
            },
            "professional_details": {
                "occupation_type": user.get("occupation", "SALARIED"),
                "income": user.get("income", 25000),
            },
            "consent_data": {
                "content": [
                   "I consent to Keshva Credit and its Lending partners being appointed as my authorized representatives to receive my credit information from Credit Bureaus for the purpose of loan offers as per their as per their respective terms of use. I consent to being contacted by Keshva Credit and its Lending Partners through phone, email, or any other mode of communication including Whatsapp, IVR for the purpose of availing loans, credit cards, related information and promotions."
                ],
                "consent_dtm": consent_dtm
            }
        },
        "api_code": API_CODE,
    }

    json_str = json.dumps(payload, separators=(",", ":"))
    encrypted_payload = encrypt_aes(json_str, KEY, IV)
    checksum = generate_checksum(encrypted_payload)

    headers = {
        "Content-Type": "application/json",
        "api-code": API_CODE,
        "Authorization": AUTH_TOKEN,
    }

    final_payload = {
        "payload": encrypted_payload,
        "checksum": checksum,
    }

    try:
        res = requests.post(API_URL, headers=headers, json=final_payload, timeout=10)
        res_data = res.json()

        if "payload" in res_data:
            decrypted = decrypt_aes(res_data["payload"], KEY, IV)
            return json.loads(decrypted)
        return res_data
    except Exception as e:
        return {"status": "error", "message": str(e)}

# === Batch Processor ===
async def processBatch(users):
    for user in users:
        phone = user.get("phone")

        print(f"📤 Sending lead for: {phone}")
        response = sendToNewAPI(user)
        print(f"📥 Response for {phone}:", response)

        update = UserDB.update_one(
            {"phone": phone},
            {
                "$push": {
                    "apiResponse": {
                        "lendanclub": response,
                        "message": response.get("message", "No message"),
                        "createdAt": datetime.utcnow().isoformat(),
                    },
                    "RefArr": {
                        "name": "lendanclub",
                        "createdAt": datetime.utcnow().isoformat(),
                    },
                },
                "$unset": {"accounts": ""},
            },
        )
        print(f"✅ Mongo Updated for {phone}: {update.raw_result}")

# === Loop Logic ===
def loop():
    processed_count = 0
    while True:
        leads = list(
            UserDB.aggregate([
                {
                    "$match": {
                        "RefArr.name": {"$ne": "lendanclub"},
                    }
                },
                {"$limit": MAX_LEADS},
            ])
        )

        if not leads:
            print("🚫 No more leads to process.")
            break

        asyncio.run(processBatch(leads))

        processed_count += len(leads)
        print(f"✅ Total Processed: {processed_count}")
        time.sleep(1)
        print("⏳ Waiting 1 second before next batch...")

    client.close()

# === Start Processing ===
if __name__ == "__main__":
    loop()
