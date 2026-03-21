import logging
import os
from app.core.config import settings

# Define the log file path
LOG_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app.log")

# Configure the logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, mode='w'), # Overwrite mode to clear logs on startup
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(settings.PROJECT_NAME)