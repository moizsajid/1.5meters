from PIL import Image
import numpy as np
from io import BytesIO
from tqdm import tqdm
import sys, pathlib, base64, json, cv2
from monoloco.inference import TrainedPipeline

pipeline = TrainedPipeline()

fourcc = cv2.VideoWriter_fourcc(*'avc1')    
video = cv2.VideoWriter("test.mp4",fourcc, 2.5,(1920,1080))

directory = pathlib.Path(sys.argv[1])
files = sorted(directory.glob('*.jpg'))

jsondir = pathlib.Path('video_json/')
jsonfiles = sorted(jsondir.glob('*.json'), key=lambda x: int(x.stem.split('.')[0]))
results = []

for f, fjson in tqdm(zip(files, jsonfiles)):
    im = Image.open(f)
    im_file = BytesIO()
    im.thumbnail((960, 540))
    im.save(im_file, format="JPEG")
    im_bytes = im_file.getvalue()  # im_bytes: image in binary format.
    b64 = "data:image/jpeg;base64," + base64.b64encode(im_bytes).decode("utf-8")

    with open(fjson, 'r') as fp:
        result = json.load(fp)

    result['thumbnails'] = pipeline.thumbnails(im, result['boxes'])
    result['image'] = b64

    results.append(result)
    imtemp = im.copy()
    video.write(cv2.cvtColor(np.array(imtemp), cv2.COLOR_RGB2BGR))

video.release()    

with open('data.json', 'w') as fp:
    json.dump(results, fp)
