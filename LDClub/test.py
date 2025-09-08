import os
import json
import hashlib
import base64
import requests
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from datetime import datetime
from dotenv import load_dotenv
import time

load_dotenv()

BASE_URL = "https://im-lsp.lendenclub.com/"
PARTNER_CODE = "KC"
KEY = "3765d4ed4946bf61fc789020a6ed0262"  # utf-8 string
IV = "d9f5c9dae54fdd5b"                  # utf-8 string
AES_BLOCK_SIZE = 32
BATCH_SIZE = 5

# ===== AES Encryption / Decryption =====
def encrypt_aes(plain_text: str, key: str, iv: str) -> str:
    cipher = AES.new(key.encode("utf-8"), AES.MODE_CBC, iv.encode("utf-8"))
    encrypted = cipher.encrypt(pad(plain_text.encode("utf-8"), AES.block_size))
    return base64.b64encode(encrypted).decode("utf-8")

def decrypt_aes(encrypted_text: str, key: str, iv: str) -> str:
    cipher = AES.new(key.encode("utf-8"), AES.MODE_CBC, iv.encode("utf-8"))
    decrypted = cipher.decrypt(base64.b64decode(encrypted_text))
    return unpad(decrypted, AES.block_size).decode("utf-8")

def generate_checksum(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()

# ===== Helper =====
def format_dob(dob_value):
    if not dob_value:
        return "01/01/1990"
    try:
        if isinstance(dob_value, datetime):
            return dob_value.strftime("%d/%m/%Y")
        return datetime.strptime(str(dob_value), "%Y-%m-%d").strftime("%d/%m/%Y")
    except:
        return "01/01/1990"

# ===== Build Payloads =====
def build_dedupe_payload(user):
    return {"params": {"pan": user.get("pan", ""), "mobile_number": str(user.get("phone", ""))},
            "fields": {}, "json": {}, "attributes": {}}

def build_lead_payload(user):
    return {
        "params": {},
        "fields": {},
        "json": {
            "basic_details": {
                "mobile_number": str(user.get("phone", "9999999999")),
                "email": user.get("email", "test@gmail.com"),
                "name": user.get("name", "Demo User"),
                "pan": user.get("pan", "ABCDE1234F"),
                "date_of_birth": format_dob(user.get("dob")),
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

# ===== Call API =====
def call_api(api_code: str, payload_data: dict):
    payload = {
        "params": payload_data.get("params", {}),
        "fields": payload_data.get("fields", {}),
        "json": payload_data.get("json", {}),
        "attributes": payload_data.get("attributes", {}),
        "api_code": api_code,
    }

    json_str = json.dumps(payload, separators=(",", ":"))
    encrypted_payload = encrypt_aes(json_str, KEY, IV)
    checksum = generate_checksum(encrypted_payload)

    # ✅ Print before API hit
    print("\n--- API HIT INFO ---")
    print("Checksum:", checksum)
    print("Payload:", encrypted_payload)

    body = {"checksum": checksum, "payload": encrypted_payload}
    url = f"{BASE_URL}/{PARTNER_CODE}/"

    try:
        res = requests.post(url, json=body, timeout=15)
        res_json = res.json()

        print("\n--- API RESPONSE (Encrypted) ---")
        print(json.dumps(res_json, indent=2, ensure_ascii=False))

        if "payload" in res_json:
            decrypted = decrypt_aes(res_json["payload"], KEY, IV)
            print("\n--- API RESPONSE (Decrypted) ---")
            print(json.dumps(json.loads(decrypted), indent=2, ensure_ascii=False))

        return res_json

    except Exception as e:
        print("\n--- API ERROR ---")
        print(str(e))
        return None

# ===== Main Process =====
def process_users(users):
    for user in users:
        phone = user.get("phone", "UNKNOWN")
        print(f"\n🚀 Processing user {phone}")
        call_api("BORROWER_USER_DEDUPE", build_dedupe_payload(user))
        call_api("CREATE_LEAD_API", build_lead_payload(user))
        time.sleep(1)  # avoid too fast API calls

# ===== Entry Point =====
if __name__ == "__main__":
    # Example user list
    users = [
        {"phone": "9747664288", "pan": "AGAPT6372M"},
        {"phone": "9334180053", "pan": "ABCDE1234F"},
    ]
    process_users(users)
