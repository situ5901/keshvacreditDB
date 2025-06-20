import pandas as pd
from pymongo import MongoClient

# Load phone numbers from CSV
df = pd.read_csv("phones.csv")

# Clean and format numbers: remove non-digits, trim spaces, convert to string
phone_numbers = df['phone'].astype(str).str.replace(r'\D', '', regex=True).str.strip().tolist()
total_phones = len(phone_numbers)

# Connect to MongoDB
client = MongoClient("mongodb+srv://keshvacredit:Vishal12Meham34Keshva@keshvacredit.ftbuh58.mongodb.net/")
db = client['keshvacredit']
collection = db['userdb']

# Find matching documents in chunks
chunk_size = 10000
found_total = 0
matched_numbers = set()

for i in range(0, total_phones, chunk_size):
    chunk = phone_numbers[i:i + chunk_size]

    results = collection.find({ "phone": { "$in": chunk } }, { "phone": 1 })
    matched_chunk = [doc['phone'] for doc in results if 'phone' in doc]
    
    found = len(matched_chunk)
    matched_numbers.update(str(p).strip() for p in matched_chunk)

    print(f"🔎 Chunk {i//chunk_size + 1}: Found {found} records")
    found_total += found

# Calculate unmatched
not_found_numbers = list(set(phone_numbers) - matched_numbers)
not_found = len(not_found_numbers)

# Final report
print("\n📊 Final Report:")
print(f"📁 Total phone numbers in CSV: {total_phones}")
print(f"✅ Phone numbers found in MongoDB: {found_total}")
print(f"❌ Phone numbers not found: {not_found}")

# Optionally print a few not found
if not_found > 0:
    print("\n🧾 Sample not found numbers:")
    print(not_found_numbers[:10])
