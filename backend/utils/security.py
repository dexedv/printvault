import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from config import settings


class EncryptionManager:
    """Handle encryption/decryption of sensitive data like API keys"""

    def __init__(self):
        self._fernet = None

    @property
    def fernet(self) -> Fernet:
        if self._fernet is None:
            key = self._get_key()
            self._fernet = Fernet(key)
        return self._fernet

    def _get_key(self) -> bytes:
        """Derive encryption key from secret"""
        salt = b'printvault-salt'
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=480000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(settings.secret_key.encode()))
        return key

    def encrypt(self, data: str) -> str:
        """Encrypt a string"""
        if not data:
            return ""
        encrypted = self.fernet.encrypt(data.encode())
        return base64.urlsafe_b64encode(encrypted).decode()

    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt a string"""
        if not encrypted_data:
            return ""
        try:
            decoded = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted = self.fernet.decrypt(decoded)
            return decrypted.decode()
        except Exception:
            return ""


# Global instance
encryption = EncryptionManager()
