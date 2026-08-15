import io
from minio import Minio
from minio.error import S3Error
from app.config import get_settings

settings = get_settings()


class StorageService:
    def __init__(self):
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=False,
        )
        self.bucket = settings.MINIO_BUCKET
        self._ensure_bucket()

    def _ensure_bucket(self):
        try:
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)
        except S3Error as e:
            print(f"MinIO bucket error: {e}")

    def upload_file(self, object_name: str, data: bytes, content_type: str) -> str:
        self.client.put_object(
            self.bucket,
            object_name,
            io.BytesIO(data),
            length=len(data),
            content_type=content_type,
        )
        return object_name

    def get_file(self, object_name: str) -> bytes:
        response = self.client.get_object(self.bucket, object_name)
        return response.read()

    def delete_file(self, object_name: str):
        self.client.remove_object(self.bucket, object_name)


storage_service = StorageService()
