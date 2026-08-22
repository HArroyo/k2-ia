import json
import logging
import os
import time
import cv2
try:
    import redis
except ImportError:
    redis = None
import requests
from config import settings

logger = logging.getLogger("k2-redis")

class RedisNotifier:
    def __init__(self):
        self.r = None
        self._connect()

    def _connect(self):
        if not redis:
            logger.info("Módulo 'redis' no instalado en este entorno Python. Modo fallback activo.")
            self.r = None
            return
        try:
            self.r = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                decode_responses=True,
                socket_timeout=2.0
            )
            self.r.ping()
            logger.info(f"Connected to Redis at {settings.REDIS_HOST}:{settings.REDIS_PORT}")
        except Exception as e:
            logger.warning(f"Redis connection failed ({e}). Running in fallback mode.")
            self.r = None

    def publish_event(self, event_data: dict, frame=None):
        """
        Saves snapshot, publishes event to Redis channel 'k2:alerts' and informs Laravel API.
        """
        timestamp_str = time.strftime("%Y%m%d_%H%M%S")
        subtipo = event_data.get("subtipo", "evento")
        filename = f"EVID_{timestamp_str}_{subtipo}_{int(time.time()*1000)%10000}.jpg"
        snapshot_full_path = os.path.join(settings.SNAPSHOT_DIR, filename)

        if frame is not None:
            try:
                cv2.imwrite(snapshot_full_path, frame)
                event_data["snapshot_path"] = f"/snapshots/{filename}"
                event_data["snapshot_filename"] = filename
            except Exception as e:
                logger.error(f"Error saving snapshot: {e}")
                event_data["snapshot_path"] = ""
        else:
            event_data["snapshot_path"] = ""

        # Publish to Redis
        payload = json.dumps(event_data)
        if self.r:
            try:
                self.r.publish("k2:alerts", payload)
            except Exception as e:
                logger.warning(f"Failed to publish to Redis: {e}")
                self._connect()

        # Send to Laravel API
        try:
            requests.post(
                f"{settings.BACKEND_API_URL}/eventos",
                json=event_data,
                timeout=0.2
            )
        except Exception:
            pass

        return event_data

notifier = RedisNotifier()
