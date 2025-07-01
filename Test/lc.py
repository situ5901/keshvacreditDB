import json
import base64
import hashlib
import requests
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad

KEY = "03f4e9c37121bbe88545b5a06cd7e619"
IV = "47ed667825c963ab"

API_URL = "https://dev-tsp-los.lendenclub.com/v2"

data = {
    "partner_code": "PILOT",
    "api_code": "BASIC_ONBOARDING",
    "product_type": "STPL",
    "payload": {
        "basic_details": {
            "mobile_number": "9876543210",
            "email": "test@test.com",
            "name": "John Doe",
            "pan": "ABCDE1234F",
            "date_of_birth": "01/01/1990"
        }
    }
}

json_data = json.dumps(data)

# AES encryption
cipher = AES.new(KEY.encode(), AES.MODE_CBC, IV.encode())
padded_data = pad(json_data.encode(), AES.block_size)
encrypted = cipher.encrypt(padded_data)

# base64 encode
encoded_payload = base64.b64encode(encrypted).decode()

# checksum
checksum = hashlib.sha256(encoded_payload.encode()).hexdigest()

# request body
request_body = {
    "partner_code": data["partner_code"],
    "api_code": data["api_code"],
    "product_type": data["product_type"],
    "payload": encoded_payload,
    "checksum": checksum
}

print("🚀 Final request body:")
print(json.dumps(request_body, indent=2))

