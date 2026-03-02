"""
PrintVault Logger - File-based logging with all details
"""
import os
import logging
from datetime import datetime
from pathlib import Path

# Create logs directory
LOGS_DIR = Path(__file__).parent.parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)

LOG_FILE = LOGS_DIR / "printvault.log"

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, encoding='utf-8'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("printvault")


def log_info(message: str):
    """Log info message"""
    logger.info(message)


def log_error(message: str, error=None):
    """Log error with optional exception"""
    if error:
        logger.error(f"{message}: {error}")
    else:
        logger.error(message)


def log_debug(message: str):
    """Log debug message"""
    logger.debug(message)


def get_log_content() -> str:
    """Get all log content"""
    try:
        if LOG_FILE.exists():
            with open(LOG_FILE, 'r', encoding='utf-8') as f:
                return f.read()
        return "No logs found"
    except Exception as e:
        return f"Error reading logs: {e}"


def clear_logs():
    """Clear log file"""
    try:
        with open(LOG_FILE, 'w', encoding='utf-8') as f:
            f.write(f"=== Logs cleared at {datetime.now().isoformat()} ===\n")
    except Exception as e:
        logger.error(f"Error clearing logs: {e}")
