import base64
import hashlib
import json
import requests
from Crypto.Cipher import AES

# ✅ LendenClub API Constants
API_URL = "https://dev-tsp-los.lendenclub.com/v2/lead/create"
KEY = "03f4e9c37121bbe88545b5a06cd7e619"  # 32 bytes for AES-256
IV = "47ed667825c963ab"                  # 16 bytes for AES CBC
PARTNER_CODE = "LKC"
AUTH_TOKEN = "e70783bb76614b48a9299c77367748"  # STPL Token
API_CODE = "CREATE_LEAD_API_V2"
AES_BLOCK_SIZE = 32

payload = {
    "partner_code": PARTNER_CODE,
    "api_code": API_CODE,
    "product_type": "STPL",

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
            "state_code": "hisar"
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

def pad(data: str) -> bytes:
    pad_len = AES_BLOCK_SIZE - len(data.encode("utf-8")) % AES_BLOCK_SIZE
    return data.encode("utf-8") + bytes([pad_len] * pad_len)

def unpad(data: bytes) -> str:
    pad_len = data[-1]
    return data[:-pad_len].decode("utf-8")

# ✅ AES Encryption/Decryption
def encrypt_aes(plain_text: str, key: str, iv: str) -> str:
    cipher = AES.new(key.encode("utf-8"), AES.MODE_CBC, iv.encode("utf-8"))
    encrypted = cipher.encrypt(pad(plain_text))
    return base64.b64encode(encrypted).decode("utf-8")

def decrypt_aes(encrypted_text: str, key: str, iv: str) -> str:
    cipher = AES.new(key.encode("utf-8"), AES.MODE_CBC, iv.encode("utf-8"))
    decrypted = cipher.decrypt(base64.b64decode(encrypted_text))
    return unpad(decrypted)

# ✅ SHA256 Checksum
def generate_checksum(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()

# ✅ API Request Function
def send_lead_request():
    try:
        # Convert and Encrypt
        json_str = json.dumps(payload, separators=(",", ":"))
        encrypted_payload = encrypt_aes(json_str, KEY, IV)
        checksum = generate_checksum(encrypted_payload)

        # Headers
        headers = {
            "Content-Type": "application/json",
            "api-code": API_CODE,
            "Authorization": AUTH_TOKEN
        }

        # Final Payload
        final_payload = {
            "payload": encrypted_payload,
            "checksum": checksum
        }

        # Show Raw Request
        print("🔐 Encrypted Payload:\n", json.dumps(final_payload, indent=2))
        print("📩 Headers:\n", json.dumps(headers, indent=2))

        # Send POST Request
        response = requests.post(API_URL, headers=headers, json=final_payload)

        try:
            result = response.json()
            if "payload" in result:
                decrypted = decrypt_aes(result["payload"], KEY, IV)
                print("🔓 Decrypted Response:\n", json.dumps(json.loads(decrypted), indent=2))
            else:
                print("📡 Response:\n", json.dumps(result, indent=2))
        except Exception as e:
            print("❌ JSON Parse Error:", e)
            print(response.text)

    except Exception as e:
        print("❌ Error:", str(e))

# ✅ Entry Point
if __name__ == "__main__":
    send_lead_request()
