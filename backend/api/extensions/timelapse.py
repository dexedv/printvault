"""
Timelapse Extension - Create timelapse videos from print photos
"""
import os
import json
import subprocess
import shutil
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
from PIL import Image


class TimelapseManager:
    """Manager for creating timelapse videos"""

    def __init__(self, storage_path: Path):
        self.storage_path = storage_path
        self.timelapses_path = storage_path / "timelapses"
        self.frames_path = storage_path / "timelapse_frames"
        self.timelapses_path.mkdir(parents=True, exist_ok=True)
        self.frames_path.mkdir(parents=True, exist_ok=True)

    def create_timelapse(
        self,
        name: str,
        frame_interval: int = 5,
        fps: int = 30
    ) -> Dict[str, Any]:
        """Create a new timelapse recording session"""
        session_id = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        session_path = self.frames_path / f"{name}_{session_id}"
        session_path.mkdir(parents=True, exist_ok=True)

        config = {
            "session_id": session_id,
            "name": name,
            "frame_interval": frame_interval,
            "fps": fps,
            "frames": [],
            "started_at": datetime.utcnow().isoformat(),
            "path": str(session_path)
        }

        # Save config
        config_file = session_path / "config.json"
        with open(config_file, "w") as f:
            json.dump(config, f, indent=2)

        return config

    def add_frame(
        self,
        session_id: str,
        image_path: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Add a frame to a timelapse session"""
        # Find session directory
        session_path = None
        for d in self.frames_path.iterdir():
            if d.is_dir() and session_id in d.name:
                session_path = d
                break

        if not session_path:
            return {"success": False, "error": "Session not found"}

        # Copy frame to session
        frame_name = f"frame_{len(list(session_path.glob('*.jpg')))}.jpg"
        dest_path = session_path / frame_name

        try:
            shutil.copy2(image_path, dest_path)

            # Update config
            config_file = session_path / "config.json"
            with open(config_file) as f:
                config = json.load(f)

            frame_info = {
                "filename": frame_name,
                "timestamp": datetime.utcnow().isoformat()
            }
            if metadata:
                frame_info["metadata"] = metadata

            config["frames"].append(frame_info)

            with open(config_file, "w") as f:
                json.dump(config, f, indent=2)

            return {"success": True, "frame": frame_info}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def render_video(
        self,
        session_id: str,
        output_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Render timelapse as video"""
        # Find session directory
        session_path = None
        for d in self.frames_path.iterdir():
            if d.is_dir() and session_id in d.name:
                session_path = d
                break

        if not session_path:
            return {"success": False, "error": "Session not found"}

        # Load config
        config_file = session_path / "config.json"
        with open(config_file) as f:
            config = json.load(f)

        frames = sorted(session_path.glob("*.jpg"))
        if not frames:
            return {"success": False, "error": "No frames found"}

        output_filename = output_name or f"timelapse_{session_id}.mp4"
        output_path = self.timelapses_path / output_filename

        try:
            # Try to use ffmpeg
            frame_pattern = str(session_path / "frame_%04d.jpg")

            cmd = [
                "ffmpeg",
                "-y",
                "-framerate", str(config.get("fps", 30)),
                "-i", frame_pattern,
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                str(output_path)
            ]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300
            )

            if result.returncode != 0:
                # Fallback: create animated GIF
                output_path = output_path.with_suffix(".gif")
                self._create_gif(frames, output_path, config.get("fps", 10))

            return {
                "success": True,
                "video_path": str(output_path),
                "frame_count": len(frames)
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _create_gif(self, frames: List[Path], output_path: Path, fps: int):
        """Create animated GIF as fallback"""
        images = []
        for frame in frames[:100]:  # Limit to 100 frames for GIF
            img = Image.open(frame)
            img = img.resize((640, 480), Image.Resampling.LANCZOS)
            images.append(img)

        if images:
            images[0].save(
                output_path,
                save_all=True,
                append_images=images[1:],
                duration=int(1000 / fps),
                loop=0
            )

    def get_sessions(self) -> List[Dict[str, Any]]:
        """Get all timelapse sessions"""
        sessions = []
        for d in self.frames_path.iterdir():
            if d.is_dir():
                config_file = d / "config.json"
                if config_file.exists():
                    with open(config_file) as f:
                        sessions.append(json.load(f))
        return sessions

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific timelapse session"""
        for d in self.frames_path.iterdir():
            if d.is_dir() and session_id in d.name:
                config_file = d / "config.json"
                if config_file.exists():
                    with open(config_file) as f:
                        return json.load(f)
        return None

    def delete_session(self, session_id: str) -> bool:
        """Delete a timelapse session"""
        for d in self.frames_path.iterdir():
            if d.is_dir() and session_id in d.name:
                shutil.rmtree(d)
                return True
        return False


# Global timelapse manager instance
_timelapse_manager: Optional[TimelapseManager] = None


def get_timelapse_manager(storage_path: Path) -> TimelapseManager:
    """Get or create timelapse manager"""
    global _timelapse_manager
    if _timelapse_manager is None:
        _timelapse_manager = TimelapseManager(storage_path)
    return _timelapse_manager
