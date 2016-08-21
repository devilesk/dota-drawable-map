import os
import json

with open('/home/dota-datafiles/dist/herodata.json', 'r') as f:
	herodata = json.loads(f.read())

herokeys = [x.replace('npc_dota_hero_', '') for x in herodata.keys()]

data = {
	"heroes": [],
	"other": []
}
with open('missing_sprite_names.json', 'r') as f:
	missing_data = json.loads(f.read())


for file in os.listdir('/srv/www/devilesk.com/media/images/miniheroes'):
	h = file.split('.')[0]
	if h not in herokeys:
		print h
		if h not in missing_data:
			missing_data[h] = {
				"name": "",
				"file": file
			}
		elif missing_data[h]['name']:
			if "_alt" in h:
				d = data["heroes"]
			else:
				d = data["other"]
			d.append({
				"id": h,
				"name": missing_data[h]['name'],
				"file": file
			})
	else:
		data["heroes"].append({
			"id": h,
			"name": herodata["npc_dota_hero_" + h]['displayname'],
			"file": file
		})

data["heroes"] = sorted(data["heroes"], key=lambda k: k['name'])
data["other"] = sorted(data["other"], key=lambda k: k['name'])

with open('src/sprite_manifest.json', 'w') as f:
	f.write(json.dumps(data, indent=4, sort_keys=True))
with open('missing_sprite_names.json', 'w') as f:
	f.write(json.dumps(missing_data, indent=4, sort_keys=True))
