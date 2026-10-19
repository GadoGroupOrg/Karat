"""One-off: generate illustrative preview images for ring settings, bands, shapes and accent shapes.

Run: cd /app/backend && python gen_option_images.py   (skips images that already exist)
"""
import asyncio
import os
import uuid
from datetime import datetime, timezone

from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()
import render_service  # noqa: E402
from catalog_data import TYPES  # noqa: E402

STYLE = ("Ultra-photorealistic luxury jewelry catalogue macro photograph on a soft warm cream seamless backdrop, "
         "soft-box lighting, crisp highlights, gentle shadow, square composition, no text, no hands, no watermark. ")


def jobs():
    ring = next(t for t in TYPES if t["id"] == "ring")
    groups = {g["id"]: g for g in ring["option_groups"]}
    for s in ring["styles"]:
        yield f"setting:{s['id']}", (f"An 18k yellow gold engagement ring with a round Colombian emerald centre stone in a "
                                     f"{s['name']} setting: {s['description']} Three-quarter view focusing on the setting.")
    for b in groups["band"]["options"]:
        yield f"band:{b['id']}", (f"Close-up of an 18k yellow gold ring band, style '{b['name']}': {b['description']} "
                                  "Show the band alone lying at an angle so its design is clearly visible.")
    for sh in groups["shape"]["options"]:
        yield f"shape:{sh['id']}", (f"A single loose white diamond, {sh['name']} cut: {sh['description']} "
                                    "Viewed from the top, centred, showing the outline and facet pattern clearly.")
    for a in groups["accent_shape"]["options"]:
        yield f"accent_shape:{a['id']}", (f"A neat row of five tiny loose {a['name'].lower()}-cut white diamonds "
                                          f"({a['description']}) arranged on the backdrop, macro detail.")


async def one(db, key, prompt, sem):
    async with sem:
        if await db.option_images.find_one({"key": key}):
            return
        for attempt in range(2):
            try:
                chat = LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=f"opt-{uuid.uuid4()}",
                               system_message="You are a world-class jewelry product photographer.")
                chat.with_model("gemini", render_service.MODEL).with_params(modalities=["image", "text"])
                _, images = await chat.send_message_multimodal_response(UserMessage(text=STYLE + prompt))
                if not images:
                    continue
                import base64
                data = base64.b64decode(images[0]["data"])
                path = f"{render_service.APP_NAME}/options/{key.replace(':', '-')}-{uuid.uuid4().hex[:8]}.png"
                await asyncio.to_thread(render_service.put_object, path, data, images[0].get("mime_type") or "image/png")
                await db.option_images.update_one({"key": key}, {"$set": {
                    "key": key, "storage_path": path, "created_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
                print("ok", key, flush=True)
                return
            except Exception as e:
                print("fail", key, e, flush=True)


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    sem = asyncio.Semaphore(5)
    await asyncio.gather(*(one(db, k, p, sem) for k, p in jobs()))


if __name__ == "__main__":
    asyncio.run(main())
