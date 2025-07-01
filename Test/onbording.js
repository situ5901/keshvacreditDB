import base64
import hashlib
import json
import requests
from Crypto.Cipher import AES

API_URL = "https://dev-tsp-los.lendenclub.com/v2/"
KEY = "03f4e9c37121bbe88545b5a06cd7e619"
IV = "47ed667825c963ab"

# IMPORTANT:
# KEY is 16-byte hex (32 chars) -> correct for AES-128
# IV must be 16 bytes total -> so padded to 16 hex characters (32 chars)
# or you can generate proper 16-byte random

payload = {
    "payload": {
        "basic_details": {
            "mobile_number": "8850689034",
            "email": "test@gmail.com",
            "name": "Bhanupriya Bhatnagar",
            "pan": "BCLPD9988G",
            "date_of_birth": "15/10/1990"
        },
        "address_details": {
            "type": "COMMUNICATION",
            "address_line": "charni Road",
            "pincode": 400009,
            "state_code": "MH"
        },
        "professional_details": {
            "occupation_type": "SALARIED",
            "company_name": "COMPANY NAME",
            "income": 30000
        },
        "loan_details": {
            "amount": 10000,
            "interest": {
                "type": "FLAT",
                "frequency": "MONTHLY",
                "value": 3
            },
            "tenure": {
                "type": "MONTHLY",
                "value": 2
            }
        },
        "consent_data": {
            "content": ["testing-message"],
            "ip_address": "127.0.0.1",
            "latitude": 18.520430,
            "longitude": 19.520430,
            "device_id": "23456789",
            "consent_dtm": "2024-09-05 12:04:31.132 +0530"
        }
    },
    "api_code": "CREATE_LEAD_API_V2"
}


def pad(data: str) -> bytes:
    pad_len = AES_BLOCK_SIZE - (len(data.encode("utf-8")) % AES_BLOCK_SIZE)
    return data.encode("utf-8") + bytes([pad_len] * pad_len)

def unpad(data: bytes) -> str:
    pad_len = data[-1]
    return data[:-pad_len].decode("utf-8")

def encrypt_aes(plain_text: str, key: str, iv: str) -> str:
    key_bytes = bytes.fromhex(key)
    iv_bytes = bytes.fromhex(iv)
    cipher = AES.new(key_bytes, AES.MODE_CBC, iv_bytes)
    padded_data = pad(plain_text)
    encrypted = cipher.encrypt(padded_data)
    return base64.b64encode(encrypted).decode("utf-8")

def decrypt_aes(cipher_text: str, key: str, iv: str) -> str:
    key_bytes = bytes.fromhex(key)
    iv_bytes = bytes.fromhex(iv)
    cipher = AES.new(key_bytes, AES.MODE_CBC, iv_bytes)
    encrypted_data = base64.b64decode(cipher_text)
    decrypted = cipher.decrypt(encrypted_data)
    return unpad(decrypted)

def generate_hash(data: str) -> str:
    return hashlib.sha256(data.encode('utf-8')).hexdigest()

def send_post_request():
    json_payload = json.dumps(payload, separators=(",", ":"))
    encrypted_payload = encrypt_aes(json_payload, KEY, IV)
    checksum = generate_hash(encrypted_payload)

    request_data = {
        "payload": encrypted_payload,
        "checksum": checksum
    }
    headers = {
        "Content-Type": "application/json",
        "partner_code": "CM"
    }

    try:
        response = requests.post(API_URL, headers=headers, json=request_data)
        response.raise_for_status()
        response_data = response.json()
        print("Raw response:", response_data)

        encrypted_resp_payload = response_data.get("payload", "")
        if encrypted_resp_payload:
            decrypted = decrypt_aes(encrypted_resp_payload, KEY, IV)
            print("Decrypted kar diya bhai:\n", decrypted)
        else:
            print("No encrypted payload in response")

    except requests.exceptions.RequestException as e:
        print("API error:", e)

if __name__ == "__main__":
    send_post_request()
