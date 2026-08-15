from unittest.mock import patch


def test_process_ocr_machine(auth_client, fake_image, monkeypatch):
    client, _ = auth_client()

    # Upload
    upload = client.post(
        "/api/documents/upload",
        files={"file": ("test.png", fake_image, "image/png")},
    ).json()
    doc_id = upload["id"]

    # Mock OCR
    from app.services import ocr_service as ocr_module
    monkeypatch.setattr(
        ocr_module.ocr_service,
        "transcribe",
        lambda image_bytes, mode, language_hint: {
            "raw_text": "بسم الله",
            "lines": ["بسم الله"],
            "words": [{"text": "بسم", "confidence": 0.95}, {"text": "الله", "confidence": 0.95}],
            "characters": [],
            "confidence": 0.95,
            "processing_time_ms": 120,
            "mode": mode,
        },
    )

    response = client.post(f"/api/ocr/{doc_id}", json={"mode": "machine", "language_hint": "ar"})
    assert response.status_code == 200
    data = response.json()
    assert data["raw_text"] == "بسم الله"
    assert data["mode"] == "machine"


def test_list_transcriptions(auth_client, fake_image, monkeypatch):
    client, _ = auth_client()
    upload = client.post(
        "/api/documents/upload",
        files={"file": ("test.png", fake_image, "image/png")},
    ).json()
    doc_id = upload["id"]

    from app.services import ocr_service as ocr_module
    monkeypatch.setattr(
        ocr_module.ocr_service,
        "transcribe",
        lambda image_bytes, mode, language_hint: {
            "raw_text": "test",
            "lines": ["test"],
            "words": [],
            "characters": [],
            "confidence": 0.9,
            "processing_time_ms": 100,
            "mode": mode,
        },
    )

    client.post(f"/api/ocr/{doc_id}", json={"mode": "machine"})
    response = client.get(f"/api/ocr/{doc_id}/transcriptions")
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_correct_transcription(auth_client, fake_image, monkeypatch):
    client, _ = auth_client()
    upload = client.post(
        "/api/documents/upload",
        files={"file": ("test.png", fake_image, "image/png")},
    ).json()
    doc_id = upload["id"]

    from app.services import ocr_service as ocr_module
    monkeypatch.setattr(
        ocr_module.ocr_service,
        "transcribe",
        lambda image_bytes, mode, language_hint: {
            "raw_text": "bonjoue",
            "lines": ["bonjoue"],
            "words": [],
            "characters": [],
            "confidence": 0.8,
            "processing_time_ms": 100,
            "mode": mode,
        },
    )

    transcription = client.post(f"/api/ocr/{doc_id}", json={"mode": "machine"}).json()
    response = client.post(f"/api/ocr/transcriptions/{transcription['id']}/correct", json={
        "original_value": "bonjoue",
        "corrected_value": "bonjour",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["corrected_text"] == "bonjour"
