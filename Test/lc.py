import base64
import hashlib
import json
import requests
from Crypto.Cipher import AES

# ✅ Constants
API_URL = "https://dev-tsp-los.lendenclub.com/v2"
KEY = "03f4e9c37121bbe88545b5a06cd7e619"
IV = "47ed667825c963ab"
PARTNER_CODE = "LKC"
AUTH_TOKEN = "e70783bb76614b48a9299c77367748"
API_CODE = "CREATE_LEAD_API_V2"
AES_BLOCK_SIZE = 16

# ✅ Your Updated Payload
payload = {
    "partner_code": PARTNER_CODE,
    "api_code": API_CODE,
    "product_type": "STPL",  # Required for this token

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
            "pincode": 5200156,
            "state_code": "MH"
        },
        "professional_details": {
            "occupation_type": "SALARIED",
            "company_name": "COMPANY NAME",
            "income": 30000,
            "bureau_score": 650
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
            "content": [
                "",
                ""
            ],
            "ip_address": "127.0.0.1",
            "latitude": 18.520430,
            "longitude": 19.520430,
            "device_id": "23456789",
            "consent_dtm": "2024-09-05 12:04:31.132 +0530"
        }
    }

}

# ✅ AES Helpers
def pad(input_string: str) -> bytes:
    pad_len = AES_BLOCK_SIZE - (len(input_string.encode('utf-8')) % AES_BLOCK_SIZE)
    return input_string.encode('utf-8') + bytes([pad_len] * pad_len)

def unpad(padded_bytes: bytes) -> str:
    pad_len = padded_bytes[-1]
    return padded_bytes[:-pad_len].decode('utf-8')

def encrypt_aes(plain_text: str, key: str, iv: str) -> str:
    cipher = AES.new(key.encode("utf-8"), AES.MODE_CBC, iv.encode("utf-8"))
    padded_data = pad(plain_text)
    encrypted = cipher.encrypt(padded_data)
    return base64.b64encode(encrypted).decode('utf-8')

def decrypt_aes(cipher_text: str, key: str, iv: str) -> str:
    decoded = base64.b64decode(cipher_text)
    cipher = AES.new(key.encode("utf-8"), AES.MODE_CBC, iv.encode("utf-8"))
    decrypted = cipher.decrypt(decoded)
    return unpad(decrypted)

def generate_hash(input_string: str) -> str:
    return hashlib.sha256(input_string.encode('utf-8')).hexdigest()

# ✅ POST Request
def send_post_request():
    json_payload = json.dumps(payload, separators=(",", ":"))
    encrypted_payload = encrypt_aes(json_payload, KEY, IV)
    checksum = generate_hash(encrypted_payload)

    headers = {
        "Content-Type": "application/json",
        "partner-code": PARTNER_CODE,
        "token": AUTH_TOKEN
    }

    request_data = {
        "payload": encrypted_payload,
        "checksum": checksum
    }

    print("🔐 Encrypted Payload:\n", json.dumps(request_data, indent=2))
    print("📩 Headers:\n", json.dumps(headers, indent=2))

    response = requests.post(API_URL, headers=headers, json=request_data)

    try:
        result = response.json()
        if "payload" in result:
            decrypted = decrypt_aes(result["payload"], KEY, IV)
            print("🔓 Decrypted Response:\n", json.dumps(json.loads(decrypted), indent=2))
        else:
            print("📡 Raw Response:\n", json.dumps(result, indent=2))
    except Exception:
        print("❌ Invalid JSON response")
        print(response.text)


# ✅ Run it
if __name__ == "__main__":
    send_post_request()
