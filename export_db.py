import os
import json
from replit import db

data = {}
for key in db.keys():
    data[key] = db[key]

with open('database_backup.json', 'w') as f:
    json.dump(data, f, indent=4)

print("Database has been backed up to database_backup.json")
