import cloudinary
import cloudinary.uploader
from backend.config import CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

cloudinary.config(
    cloud_name = CLOUDINARY_CLOUD_NAME,
    api_key    = CLOUDINARY_API_KEY,
    api_secret = CLOUDINARY_API_SECRET,
    secure     = True
)

def upload_file(file_bytes: bytes, folder: str, resource_type: str = "auto") -> str:
    """Upload bytes to Cloudinary, return secure URL."""
    result = cloudinary.uploader.upload(
        file_bytes,
        folder=folder,
        resource_type=resource_type
    )
    return result["secure_url"]

def delete_file(public_id: str, resource_type: str = "image") -> None:
    """Delete a file from Cloudinary by public_id."""
    cloudinary.uploader.destroy(public_id, resource_type=resource_type)

def url_to_public_id(url: str) -> str:
    """Extract public_id from a Cloudinary URL."""
    # e.g. https://res.cloudinary.com/cloud/image/upload/v123/folder/filename.pdf
    parts = url.split("/upload/")
    if len(parts) < 2:
        return ""
    path = parts[1]
    # Remove version segment if present
    if path.startswith("v") and "/" in path:
        path = path.split("/", 1)[1]
    # Remove extension
    if "." in path:
        path = path.rsplit(".", 1)[0]
    return path