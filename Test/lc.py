import base64
import hashlib
import json
import requests
from Crypto.Cipher import AES

# ✅ LendenClub API Constants
API_URL = "https://dev-tsp-los.lendenclub.com/v2"
KEY = "03f4e9c37121bbe88545b5a06cd7e619"  # 32 bytes 
IV = "47ed667825c963ab"                  # 16 bytes
PARTNER_CODE = "LKC"
AUTH_TOKEN = "e70783bb76614b48a9299c77367748"  
API_CODE = "CREATE_LEAD_API_V2"
AES_BLOCK_SIZE = 32

payload = {
    "payload": {
        "basic_details": {
            "name": "Vishal",
            "mobile_number": "9696965689",
            "email": "vishal@gmail.com",
            "pan": "BCLPD9987G",
            "date_of_birth": "15/10/1990",
            "occupation_type": "SALARIED",
            "pincode": 520015,
            "income": 30000,
            "amount": 10000,
        },
        "consent_data": {
            "consent": True
        },
        "content": ["sms", "email"]
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
