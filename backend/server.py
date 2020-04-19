import asyncio, websockets, json
from monoloco.inference import TrainedPipeline

pipeline = TrainedPipeline()

async def process_image(websocket, path):
    base64 = await websocket.recv()
    base64 = base64.split(',')[-1]
    results = pipeline.inference(base64)
    await websocket.send(json.dumps(results))

start_server = websockets.serve(process_image, "localhost", 8765)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()